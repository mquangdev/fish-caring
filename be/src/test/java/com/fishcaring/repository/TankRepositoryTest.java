package com.fishcaring.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.fishcaring.RepositoryTestSupport;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.entity.TankSummaryEntity;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import com.fishcaring.object.CareTaskData;
import com.fishcaring.object.TankData;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class TankRepositoryTest extends RepositoryTestSupport {

    private static TankData data(String name) {
        return TankData.builder().name(name).build();
    }

    @Test
    void insertAndFindMapsAllFields() {
        long userId = newUser("a@example.com");
        long id = tanks.insert(userId, TankData.builder()
                .name("Be thuy sinh")
                .volumeLiters(new BigDecimal("64.8"))
                .lengthCm(new BigDecimal("60.0"))
                .widthCm(new BigDecimal("30.0"))
                .heightCm(new BigDecimal("36.0"))
                .setupDate(LocalDate.of(2026, 1, 15))
                .note("ghi chu")
                .build(), NOW);

        TankEntity tank = tanks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(tank.getName()).isEqualTo("Be thuy sinh");
        assertThat(tank.getVolumeLiters()).isEqualByComparingTo("64.8");
        assertThat(tank.getLengthCm()).isEqualByComparingTo("60");
        assertThat(tank.getWidthCm()).isEqualByComparingTo("30");
        assertThat(tank.getHeightCm()).isEqualByComparingTo("36");
        assertThat(tank.getSetupDate()).isEqualTo(LocalDate.of(2026, 1, 15));
        assertThat(tank.getNote()).isEqualTo("ghi chu");
        assertThat(tank.getCreatedAt()).isEqualTo(NOW);
    }

    @Test
    void decimalValuesKeepOneDecimalPlace() {
        long userId = newUser("a@example.com");
        long id = tanks.insert(userId, TankData.builder().name("Be").volumeLiters(new BigDecimal("0.1"))
                .lengthCm(new BigDecimal("1000.0")).build(), NOW);

        TankEntity tank = tanks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(tank.getVolumeLiters()).isEqualByComparingTo("0.1");
        assertThat(tank.getLengthCm()).isEqualByComparingTo("1000");
    }

    @Test
    void nullableFieldsStayNull() {
        long userId = newUser("a@example.com");
        long id = tanks.insert(userId, data("Be"), NOW);

        TankEntity tank = tanks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(tank.getVolumeLiters()).isNull();
        assertThat(tank.getLengthCm()).isNull();
        assertThat(tank.getWidthCm()).isNull();
        assertThat(tank.getHeightCm()).isNull();
        assertThat(tank.getSetupDate()).isNull();
        assertThat(tank.getNote()).isNull();
    }

    @Test
    void otherUsersCannotSeeUpdateOrDeleteMyTank() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long tankId = newTank(alice, "Be cua Alice");

        assertThat(tanks.findByIdAndUserId(tankId, bob)).isEmpty();
        assertThat(tanks.findAllSummariesByUserId(bob)).isEmpty();
        assertThat(tanks.update(tankId, bob, data("Hack"), NOW)).isFalse();
        assertThat(tanks.deleteByIdAndUserId(tankId, bob)).isFalse();
        assertThat(tanks.findByIdAndUserId(tankId, alice).orElseThrow().getName()).isEqualTo("Be cua Alice");
    }

    @Test
    void updateChangesFieldsAndUpdatedAtOnly() {
        long userId = newUser("a@example.com");
        long id = newTank(userId, "Cu");
        LocalDateTime later = NOW.plusHours(3);

        boolean updated = tanks.update(id, userId, TankData.builder().name("Moi")
                .volumeLiters(new BigDecimal("90.5")).build(), later);

        assertThat(updated).isTrue();
        TankEntity tank = tanks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(tank.getName()).isEqualTo("Moi");
        assertThat(tank.getVolumeLiters()).isEqualByComparingTo("90.5");
        assertThat(tank.getCreatedAt()).isEqualTo(NOW);
        assertThat(tank.getUpdatedAt()).isEqualTo(later);
    }

    @Test
    void updateReplacesDimensionsIncludingClearingThem() {
        long userId = newUser("a@example.com");
        long id = tanks.insert(userId, TankData.builder().name("Be")
                .lengthCm(new BigDecimal("60")).widthCm(new BigDecimal("30")).heightCm(new BigDecimal("36")).build(), NOW);

        tanks.update(id, userId, data("Be"), NOW.plusMinutes(1));

        TankEntity tank = tanks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(tank.getLengthCm()).isNull();
        assertThat(tank.getWidthCm()).isNull();
        assertThat(tank.getHeightCm()).isNull();
    }

    @Test
    void summariesAreScopedNewestFirstAndCountOnlyOwnTasks() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long first = tanks.insert(alice, data("Be A"), NOW);
        long second = tanks.insert(alice, TankData.builder().name("Be B").volumeLiters(new BigDecimal("60.5")).build(),
                NOW.plusMinutes(1));
        newTank(bob, "Be C");

        List<TankSummaryEntity> summaries = tanks.findAllSummariesByUserId(alice);

        assertThat(summaries).extracting(TankSummaryEntity::getId).containsExactly(second, first);
        assertThat(summaries.get(0).getName()).isEqualTo("Be B");
        assertThat(summaries.get(0).getVolumeLiters()).isEqualByComparingTo("60.5");
        assertThat(summaries.get(1).getVolumeLiters()).isNull();
        assertThat(tanks.findAllSummariesByUserId(bob)).hasSize(1);
    }

    @Test
    void summaryCountsAllTasksButNextDueOnlyFromEnabledOnes() {
        long userId = newUser("a@example.com");
        long tankId = newTank(userId, "Be");
        long other = newTank(userId, "Be khac");
        LocalDateTime soon = NOW.plusDays(1);
        LocalDateTime later = NOW.plusDays(3);
        long enabledSoon = newTask(tankId, "Cho an");
        long enabledLater = newTask(tankId, "Thay nuoc");
        long disabledEarliest = newTask(tankId, "Bon phan");
        newTask(other, "Cua be khac");
        tasks.update(enabledSoon, userId, withDue(tankId, "Cho an", soon, true), NOW);
        tasks.update(enabledLater, userId, withDue(tankId, "Thay nuoc", later, true), NOW);
        tasks.update(disabledEarliest, userId, withDue(tankId, "Bon phan", NOW.plusHours(1), false), NOW);

        TankSummaryEntity summary = tanks.findAllSummariesByUserId(userId).stream()
                .filter(t -> t.getId() == tankId).findFirst().orElseThrow();

        assertThat(summary.getTaskCount()).isEqualTo(3);
        assertThat(summary.getNextDueAt()).isEqualTo(soon);
    }

    @Test
    void summaryOfTankWithoutTasksHasZeroCountAndNoNextDue() {
        long userId = newUser("a@example.com");
        newTank(userId, "Be trong");

        TankSummaryEntity summary = tanks.findAllSummariesByUserId(userId).get(0);

        assertThat(summary.getTaskCount()).isZero();
        assertThat(summary.getNextDueAt()).isNull();
    }

    @Test
    void sameNameIsAllowedTwiceForOneUser() {
        long userId = newUser("a@example.com");

        long first = newTank(userId, "Be 1");
        long second = newTank(userId, "Be 1");

        assertThat(first).isNotEqualTo(second);
        assertThat(tanks.findAllSummariesByUserId(userId)).hasSize(2);
    }

    private CareTaskData withDue(long tankId, String title, LocalDateTime dueAt, boolean enabled) {
        return new CareTaskData(tankId, TaskType.FEED, title, null, RepeatType.DAILY, null,
                LocalTime.of(8, 0), null, null, null, null, enabled, dueAt);
    }
}
