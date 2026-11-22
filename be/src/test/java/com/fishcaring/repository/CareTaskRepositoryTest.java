package com.fishcaring.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.fishcaring.RepositoryTestSupport;
import com.fishcaring.entity.CareTaskEntity;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import com.fishcaring.object.CareTaskData;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;

class CareTaskRepositoryTest extends RepositoryTestSupport {

    @Test
    void insertAndFindMapsAllFields() {
        long userId = newUser("a@example.com");
        long tankId = newTank(userId, "Be");
        LocalDateTime due = LocalDateTime.of(2026, 11, 28, 19, 0);
        long id = tasks.insert(userId, new CareTaskData(tankId, TaskType.WATER_CHANGE, "Thay nuoc", "30%",
                RepeatType.EVERY_N_DAYS, 7, LocalTime.of(19, 0), LocalDate.of(2026, 11, 21), null, 30, null, true, due), NOW);

        CareTaskEntity task = tasks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(task.getTankId()).isEqualTo(tankId);
        assertThat(task.getType()).isEqualTo(TaskType.WATER_CHANGE);
        assertThat(task.getRepeatType()).isEqualTo(RepeatType.EVERY_N_DAYS);
        assertThat(task.getIntervalDays()).isEqualTo(7);
        assertThat(task.getTimeOfDay()).isEqualTo(LocalTime.of(19, 0));
        assertThat(task.getWaterChangePercent()).isEqualTo(30);
        assertThat(task.getFoodName()).isNull();
        assertThat(task.getFertilizerMl()).isNull();
        assertThat(task.getStartDate()).isEqualTo(LocalDate.of(2026, 11, 21));
        assertThat(task.getEnabled()).isTrue();
        assertThat(task.getNextDueAt()).isEqualTo(due);
        assertThat(task.getNote()).isEqualTo("30%");
        assertThat(task.getCreatedAt()).isEqualTo(NOW);
        assertThat(task.getUpdatedAt()).isEqualTo(NOW);
    }

    @Test
    void otherUsersCannotSeeUpdateToggleOrDeleteMyTask() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long taskId = newTask(newTank(alice, "Be"), "Cho an");

        assertThat(tasks.findByIdAndUserId(taskId, bob)).isEmpty();
        assertThat(tasks.update(taskId, bob, taskData("Hack"), NOW)).isFalse();
        assertThat(tasks.setEnabled(taskId, bob, false, null, NOW)).isFalse();
        assertThat(tasks.deleteByIdAndUserId(taskId, bob)).isFalse();

        CareTaskEntity task = tasks.findByIdAndUserId(taskId, alice).orElseThrow();
        assertThat(task.getTitle()).isEqualTo("Cho an");
        assertThat(task.getEnabled()).isTrue();
    }

    @Test
    void updateChangesFieldsAndUpdatedAtOnly() {
        long userId = newUser("a@example.com");
        long tankId = newTank(userId, "Be");
        long id = newTask(tankId, "Cu");
        LocalDateTime later = NOW.plusHours(2);

        assertThat(tasks.update(id, userId, taskData(tankId, "Moi"), later)).isTrue();

        CareTaskEntity task = tasks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(task.getTitle()).isEqualTo("Moi");
        assertThat(task.getTankId()).isEqualTo(tankId);
        assertThat(task.getCreatedAt()).isEqualTo(NOW);
        assertThat(task.getUpdatedAt()).isEqualTo(later);
    }

    @Test
    void setEnabledStoresNextDueAt() {
        long userId = newUser("a@example.com");
        long id = newTask(newTank(userId, "Be"), "Cho an");

        assertThat(tasks.setEnabled(id, userId, false, null, NOW.plusMinutes(5))).isTrue();

        CareTaskEntity task = tasks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(task.getEnabled()).isFalse();
        assertThat(task.getNextDueAt()).isNull();
    }

    @Test
    void listIsScopedToTheTank() {
        long userId = newUser("a@example.com");
        long tankA = newTank(userId, "A");
        long tankB = newTank(userId, "B");
        newTask(tankA, "1");
        newTask(tankA, "2");
        newTask(tankB, "3");

        assertThat(tasks.findAllByTankId(tankA)).extracting(CareTaskEntity::getTitle).containsExactly("1", "2");
    }

    @Test
    void generalTasksBelongToTheUserWithoutATank() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long tank = newTank(alice, "Be");
        long worms = newGeneralTask(alice, "Thay nuoc trun chi");
        newTask(tank, "Cua be");
        newGeneralTask(bob, "Cua Bob");

        assertThat(tasks.findAllGeneralByUserId(alice)).extracting(CareTaskEntity::getTitle)
                .containsExactly("Thay nuoc trun chi");
        CareTaskEntity task = tasks.findByIdAndUserId(worms, alice).orElseThrow();
        assertThat(task.getTankId()).isNull();
        assertThat(task.getUserId()).isEqualTo(alice);
        assertThat(tasks.findByIdAndUserId(worms, bob)).isEmpty();
        assertThat(tasks.deleteByIdAndUserId(worms, bob)).isFalse();
    }

    @Test
    void updateCanMoveATaskBetweenATankAndNoTank() {
        long userId = newUser("a@example.com");
        long tankId = newTank(userId, "Be");
        long id = newGeneralTask(userId, "Viec");

        assertThat(tasks.update(id, userId, taskData(tankId, "Viec"), NOW)).isTrue();
        assertThat(tasks.findByIdAndUserId(id, userId).orElseThrow().getTankId()).isEqualTo(tankId);

        assertThat(tasks.update(id, userId, taskData("Viec"), NOW)).isTrue();
        assertThat(tasks.findByIdAndUserId(id, userId).orElseThrow().getTankId()).isNull();
    }

    @Test
    void deletingATankDeletesItsTasksButNotTheGeneralOnes() {
        long userId = newUser("a@example.com");
        long tankId = newTank(userId, "Be");
        newTask(tankId, "Cua be");
        long general = newGeneralTask(userId, "Chung");

        tanks.deleteByIdAndUserId(tankId, userId);

        assertThat(tasks.findAllByTankId(tankId)).isEmpty();
        assertThat(tasks.findByIdAndUserId(general, userId)).isPresent();
    }

    @Test
    void deleteRemovesTheTask() {
        long userId = newUser("a@example.com");
        long id = newTask(newTank(userId, "Be"), "Cho an");

        assertThat(tasks.deleteByIdAndUserId(id, userId)).isTrue();
        assertThat(tasks.findByIdAndUserId(id, userId)).isEmpty();
    }

    @Test
    void activeUntilReturnsEnabledTasksDueBeforeTheLimitOldestFirstWithTheTankName() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long tank = newTank(alice, "Be 1");
        LocalDateTime until = NOW.plusDays(1);
        long late = newTask(tank, "Muon");
        long early = newGeneralTask(alice, "Som");
        long beyond = newTask(tank, "Ngay mai");
        long off = newTask(tank, "Tat");
        newGeneralTask(bob, "Cua Bob");
        tasks.update(late, alice, withDueFor(tank, "Muon", NOW.plusHours(5), true), NOW);
        tasks.update(early, alice, withDueFor(null, "Som", NOW.minusDays(2), true), NOW);
        tasks.update(beyond, alice, withDueFor(tank, "Ngay mai", until, true), NOW);
        tasks.update(off, alice, withDueFor(tank, "Tat", NOW.minusHours(1), false), NOW);

        var items = tasks.findActiveUntilByUserId(alice, until);

        assertThat(items).extracting(i -> i.getTitle()).containsExactly("Som", "Muon");
        assertThat(items.get(0).getTankId()).isNull();
        assertThat(items.get(0).getTankName()).isNull();
        assertThat(items.get(1).getTankName()).isEqualTo("Be 1");
    }

    private CareTaskData withDueFor(Long tankId, String title, LocalDateTime dueAt, boolean enabled) {
        return new CareTaskData(tankId, TaskType.FEED, title, null, RepeatType.DAILY, null,
                LocalTime.of(8, 0), null, null, null, null, enabled, dueAt);
    }
}
