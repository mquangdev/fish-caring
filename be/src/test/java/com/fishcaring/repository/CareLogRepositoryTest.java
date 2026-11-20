package com.fishcaring.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.fishcaring.RepositoryTestSupport;
import com.fishcaring.entity.CareLogEntity;
import com.fishcaring.enums.CareResult;
import org.junit.jupiter.api.Test;

class CareLogRepositoryTest extends RepositoryTestSupport {

    @Test
    void recentLogsAreNewestFirstAndRespectLimit() {
        long userId = newUser("a@example.com");
        long tankId = newTank(userId, "Be");
        long taskId = newTask(tankId, "Cho an");
        long oldest = logs.insert(tankId, taskId, "Cho an", CareResult.DONE, NOW, NOW.plusMinutes(1));
        long middle = logs.insert(tankId, taskId, "Cho an", CareResult.SNOOZED, NOW, NOW.plusMinutes(2));
        long newest = logs.insert(tankId, taskId, "Cho an", CareResult.DONE, NOW, NOW.plusMinutes(3));

        assertThat(logs.findRecentByTankId(tankId, 50)).extracting(CareLogEntity::getId)
                .containsExactly(newest, middle, oldest);
        assertThat(logs.findRecentByTankId(tankId, 2)).extracting(CareLogEntity::getId)
                .containsExactly(newest, middle);
    }

    @Test
    void insertMapsFields() {
        long tankId = newTank(newUser("a@example.com"), "Be");
        long taskId = newTask(tankId, "Cho an");

        logs.insert(tankId, taskId, "Cho an", CareResult.SNOOZED, NOW, NOW.plusMinutes(1));

        CareLogEntity log = logs.findRecentByTankId(tankId, 1).get(0);
        assertThat(log.getTaskId()).isEqualTo(taskId);
        assertThat(log.getTaskTitle()).isEqualTo("Cho an");
        assertThat(log.getResult()).isEqualTo(CareResult.SNOOZED);
        assertThat(log.getDueAt()).isEqualTo(NOW);
        assertThat(log.getActedAt()).isEqualTo(NOW.plusMinutes(1));
    }
}
