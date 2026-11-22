package com.fishcaring.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fishcaring.RepositoryTestSupport;
import com.fishcaring.entity.TankFishEntity;
import com.fishcaring.enums.FishStatus;
import com.fishcaring.object.TankFishData;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class TankFishRepositoryTest extends RepositoryTestSupport {

    @Test
    void insertAllThenFindMapsStatus() {
        long tankId = newTank(newUser("a@example.com"), "Be");

        fish.insertAll(tankId, List.of(
                new TankFishData("Neon", 10, FishStatus.ALIVE),
                new TankFishData("Neon", 2, FishStatus.DEAD)), NOW);

        // read back newest first: the row inserted last comes first
        List<TankFishEntity> rows = fish.findAllByTankId(tankId);
        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).getStatus()).isEqualTo(FishStatus.DEAD);
        assertThat(rows.get(0).getQuantity()).isEqualTo(2);
        assertThat(rows.get(0).getCreatedAt()).isEqualTo(NOW);
        assertThat(rows.get(0).getUpdatedAt()).isEqualTo(NOW);
        assertThat(rows.get(1).getStatus()).isEqualTo(FishStatus.ALIVE);
        assertThat(rows.get(1).getQuantity()).isEqualTo(10);
    }

    @Test
    void deleteAllByTankIdOnlyRemovesThatTank() {
        long userId = newUser("a@example.com");
        long tankA = newTank(userId, "A");
        long tankB = newTank(userId, "B");
        fish.insertAll(tankA, List.of(new TankFishData("Neon", 1, FishStatus.ALIVE)), NOW);
        fish.insertAll(tankB, List.of(new TankFishData("Guppy", 1, FishStatus.ALIVE)), NOW);

        fish.deleteAllByTankId(tankA);

        assertThat(fish.findAllByTankId(tankA)).isEmpty();
        assertThat(fish.findAllByTankId(tankB)).hasSize(1);
    }

    @Test
    void zeroQuantityIsRejectedByCheckConstraint() {
        long tankId = newTank(newUser("a@example.com"), "Be");

        assertThatThrownBy(() -> fish.insertAll(tankId, List.of(new TankFishData("Neon", 0, FishStatus.ALIVE)), NOW))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void unknownStatusCodeIsRejectedByCheckConstraint() {
        long tankId = newTank(newUser("a@example.com"), "Be");

        assertThatThrownBy(() -> jdbc.sql("""
                INSERT INTO tank_fish (tank_id, species_name, quantity, status, created_at, updated_at)
                VALUES (:tankId, 'Neon', 1, 2, :now, :now)
                """)
                .param("tankId", tankId)
                .param("now", NOW)
                .update())
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void fishStatusCodesMatchSpec() {
        assertThat(FishStatus.ALIVE.code()).isEqualTo(1);
        assertThat(FishStatus.DEAD.code()).isEqualTo(0);
        assertThat(FishStatus.fromCode(1)).isEqualTo(FishStatus.ALIVE);
        assertThat(FishStatus.fromCode(0)).isEqualTo(FishStatus.DEAD);
    }
}
