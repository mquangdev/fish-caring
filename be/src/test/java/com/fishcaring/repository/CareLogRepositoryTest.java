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
        long oldest = logs.insert(userId, tankId, taskId, "Cho an", CareResult.DONE, NOW, NOW.plusMinutes(1));
        long middle = logs.insert(userId, tankId, taskId, "Cho an", CareResult.SNOOZED, NOW, NOW.plusMinutes(2));
        long newest = logs.insert(userId, tankId, taskId, "Cho an", CareResult.DONE, NOW, NOW.plusMinutes(3));

        assertThat(logs.findRecentByTankId(tankId, userId, 50)).extracting(CareLogEntity::getId)
                .containsExactly(newest, middle, oldest);
        assertThat(logs.findRecentByTankId(tankId, userId, 2)).extracting(CareLogEntity::getId)
                .containsExactly(newest, middle);
    }

    @Test
    void insertMapsFields() {
        long userId = newUser("a@example.com");
        long tankId = newTank(userId, "Be");
        long taskId = newTask(tankId, "Cho an");

        logs.insert(userId, tankId, taskId, "Cho an", CareResult.SNOOZED, NOW, NOW.plusMinutes(1));

        CareLogEntity log = logs.findRecentByTankId(tankId, userId, 1).get(0);
        assertThat(log.getUserId()).isEqualTo(userId);
        assertThat(log.getTankId()).isEqualTo(tankId);
        assertThat(log.getTaskId()).isEqualTo(taskId);
        assertThat(log.getTaskTitle()).isEqualTo("Cho an");
        assertThat(log.getResult()).isEqualTo(CareResult.SNOOZED);
        assertThat(log.getDueAt()).isEqualTo(NOW);
        assertThat(log.getActedAt()).isEqualTo(NOW.plusMinutes(1));
        assertThat(log.getCreatedAt()).isEqualTo(NOW.plusMinutes(1));
    }

    @Test
    void logsOfGeneralTasksHaveNoTankAndAreOnlyListedAsGeneral() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long tankId = newTank(alice, "Be");
        long general = newGeneralTask(alice, "Thay nuoc trun chi");
        long inTank = newTask(tankId, "Cho an");
        logs.insert(alice, null, general, "Thay nuoc trun chi", CareResult.DONE, NOW, NOW.plusMinutes(1));
        logs.insert(alice, tankId, inTank, "Cho an", CareResult.DONE, NOW, NOW.plusMinutes(2));
        logs.insert(bob, null, newGeneralTask(bob, "Cua Bob"), "Cua Bob", CareResult.DONE, NOW, NOW.plusMinutes(3));

        assertThat(logs.findRecentGeneralByUserId(alice, 50)).extracting(CareLogEntity::getTaskTitle)
                .containsExactly("Thay nuoc trun chi");
        assertThat(logs.findRecentGeneralByUserId(alice, 50).get(0).getTankId()).isNull();
        assertThat(logs.findRecentByTankId(tankId, alice, 50)).extracting(CareLogEntity::getTaskTitle)
                .containsExactly("Cho an");
    }

    @Test
    void anotherUserCannotReadTheLogsOfMyTank() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long tankId = newTank(alice, "Be");
        logs.insert(alice, tankId, newTask(tankId, "Cho an"), "Cho an", CareResult.DONE, NOW, NOW);

        assertThat(logs.findRecentByTankId(tankId, bob, 50)).isEmpty();
        assertThat(logs.findRecentGeneralByUserId(bob, 50)).isEmpty();
    }

    @Test
    void deletingAGeneralTaskKeepsItsLogWithoutATaskId() {
        long userId = newUser("a@example.com");
        long general = newGeneralTask(userId, "Chung");
        logs.insert(userId, null, general, "Chung", CareResult.DONE, NOW, NOW);

        tasks.deleteByIdAndUserId(general, userId);

        CareLogEntity log = logs.findRecentGeneralByUserId(userId, 50).get(0);
        assertThat(log.getTaskId()).isNull();
        assertThat(log.getTaskTitle()).isEqualTo("Chung");
    }
}
