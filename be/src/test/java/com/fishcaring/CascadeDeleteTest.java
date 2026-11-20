package com.fishcaring;

import static org.assertj.core.api.Assertions.assertThat;

import com.fishcaring.entity.CareLogEntity;
import com.fishcaring.enums.CareResult;
import com.fishcaring.enums.FishStatus;
import com.fishcaring.object.TankFishData;
import java.util.List;
import org.junit.jupiter.api.Test;

class CascadeDeleteTest extends RepositoryTestSupport {

    private long userId;
    private long tankId;
    private long taskId;

    private void givenFullTankWithEverything() {
        userId = newUser("a@example.com");
        tankId = newTank(userId, "Be");
        taskId = newTask(tankId, "Cho an");
        fish.insertAll(tankId, List.of(new TankFishData("Neon", 5, FishStatus.ALIVE)), NOW);
        logs.insert(tankId, taskId, "Cho an", CareResult.DONE, NOW, NOW);
        notifications.insert(userId, taskId, NOW, "Den gio cho an", NOW);
    }

    @Test
    void deletingATankRemovesFishTasksLogsAndNotifications() {
        givenFullTankWithEverything();

        assertThat(tanks.deleteByIdAndUserId(tankId, userId)).isTrue();

        assertThat(count("tank_fish")).isZero();
        assertThat(count("care_tasks")).isZero();
        assertThat(count("care_logs")).isZero();
        assertThat(count("notifications")).isZero();
        assertThat(count("users")).isEqualTo(1);
    }

    @Test
    void deletingATaskKeepsItsLogsWithNullTaskIdAndRemovesNotifications() {
        givenFullTankWithEverything();

        assertThat(tasks.deleteByIdAndUserId(taskId, userId)).isTrue();

        List<CareLogEntity> remaining = logs.findRecentByTankId(tankId, 10);
        assertThat(remaining).hasSize(1);
        assertThat(remaining.get(0).getTaskId()).isNull();
        assertThat(remaining.get(0).getTaskTitle()).isEqualTo("Cho an");
        assertThat(count("notifications")).isZero();
    }

    @Test
    void deletingAUserRemovesEverythingTheyOwn() {
        givenFullTankWithEverything();
        pushSubscriptions.insert(userId, "https://push.example/1", "key", "auth", "UA", NOW);

        jdbc.sql("DELETE FROM users WHERE id = :id").param("id", userId).update();

        assertThat(count("users")).isZero();
        assertThat(count("tanks")).isZero();
        assertThat(count("tank_fish")).isZero();
        assertThat(count("care_tasks")).isZero();
        assertThat(count("care_logs")).isZero();
        assertThat(count("notifications")).isZero();
        assertThat(count("push_subscriptions")).isZero();
    }
}
