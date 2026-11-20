package com.fishcaring.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.fishcaring.RepositoryTestSupport;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.enums.TankType;
import com.fishcaring.object.TankData;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class TankRepositoryTest extends RepositoryTestSupport {

    @Test
    void insertAndFindMapsAllFields() {
        long userId = newUser("a@example.com");
        long id = tanks.insert(userId,
                new TankData("Be thuy sinh", 60, TankType.PLANTED, LocalDate.of(2026, 1, 15), "ghi chu"), NOW);

        TankEntity tank = tanks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(tank.getName()).isEqualTo("Be thuy sinh");
        assertThat(tank.getVolumeLiters()).isEqualTo(60);
        assertThat(tank.getType()).isEqualTo(TankType.PLANTED);
        assertThat(tank.getSetupDate()).isEqualTo(LocalDate.of(2026, 1, 15));
        assertThat(tank.getNote()).isEqualTo("ghi chu");
        assertThat(tank.getCreatedAt()).isEqualTo(NOW);
    }

    @Test
    void nullableFieldsStayNull() {
        long userId = newUser("a@example.com");
        long id = tanks.insert(userId, new TankData("Be", null, TankType.OTHER, null, null), NOW);

        TankEntity tank = tanks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(tank.getVolumeLiters()).isNull();
        assertThat(tank.getSetupDate()).isNull();
        assertThat(tank.getNote()).isNull();
    }

    @Test
    void otherUsersCannotSeeUpdateOrDeleteMyTank() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long tankId = newTank(alice, "Be cua Alice");

        assertThat(tanks.findByIdAndUserId(tankId, bob)).isEmpty();
        assertThat(tanks.findAllByUserId(bob)).isEmpty();
        assertThat(tanks.update(tankId, bob, new TankData("Hack", 1, TankType.OTHER, null, null), NOW)).isFalse();
        assertThat(tanks.deleteByIdAndUserId(tankId, bob)).isFalse();
        assertThat(tanks.findByIdAndUserId(tankId, alice).orElseThrow().getName()).isEqualTo("Be cua Alice");
    }

    @Test
    void updateChangesFieldsAndUpdatedAtOnly() {
        long userId = newUser("a@example.com");
        long id = newTank(userId, "Cu");
        LocalDateTime later = NOW.plusHours(3);

        boolean updated = tanks.update(id, userId, new TankData("Moi", 90, TankType.FISH_ONLY, null, null), later);

        assertThat(updated).isTrue();
        TankEntity tank = tanks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(tank.getName()).isEqualTo("Moi");
        assertThat(tank.getType()).isEqualTo(TankType.FISH_ONLY);
        assertThat(tank.getCreatedAt()).isEqualTo(NOW);
        assertThat(tank.getUpdatedAt()).isEqualTo(later);
    }

    @Test
    void nameCheckIgnoresCaseOfVietnameseNames() {
        // Accent handling is not asserted here: H2 compares accents, MySQL (utf8mb4_unicode_ci)
        // does not, so "Be" and "Bể" are the same name on MySQL only.
        long userId = newUser("a@example.com");
        long id = newTank(userId, "Bể Thủy Sinh");

        assertThat(tanks.existsByUserIdAndNameIgnoreCase(userId, "bể thủy sinh", null)).isTrue();
        assertThat(tanks.existsByUserIdAndNameIgnoreCase(userId, "BỂ THỦY SINH", null)).isTrue();
        assertThat(tanks.existsByUserIdAndNameIgnoreCase(userId, "Bể khác", null)).isFalse();
        // editing the tank itself must not conflict with its own name
        assertThat(tanks.existsByUserIdAndNameIgnoreCase(userId, "bể thủy sinh", id)).isFalse();
    }

    @Test
    void sameNameIsAllowedForDifferentUsers() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        newTank(alice, "Be 1");

        assertThat(tanks.existsByUserIdAndNameIgnoreCase(bob, "Be 1", null)).isFalse();
    }

    @Test
    void countAndListAreScopedAndNewestFirst() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long first = tanks.insert(alice, new TankData("Be A", null, TankType.OTHER, null, null), NOW);
        long second = tanks.insert(alice, new TankData("Be B", null, TankType.OTHER, null, null), NOW.plusMinutes(1));
        newTank(bob, "Be C");

        assertThat(tanks.countByUserId(alice)).isEqualTo(2);
        assertThat(tanks.findAllByUserId(alice)).extracting(TankEntity::getId).containsExactly(second, first);
    }
}
