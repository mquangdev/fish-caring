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
        long id = tasks.insert(tankId, new CareTaskData(TaskType.WATER_CHANGE, "Thay nuoc", "30%",
                RepeatType.EVERY_N_DAYS, 7, LocalTime.of(19, 0), LocalDate.of(2026, 11, 21), true, due), NOW);

        CareTaskEntity task = tasks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(task.getTankId()).isEqualTo(tankId);
        assertThat(task.getType()).isEqualTo(TaskType.WATER_CHANGE);
        assertThat(task.getRepeatType()).isEqualTo(RepeatType.EVERY_N_DAYS);
        assertThat(task.getIntervalDays()).isEqualTo(7);
        assertThat(task.getTimeOfDay()).isEqualTo(LocalTime.of(19, 0));
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
        long id = newTask(newTank(userId, "Be"), "Cu");
        LocalDateTime later = NOW.plusHours(2);

        assertThat(tasks.update(id, userId, taskData("Moi"), later)).isTrue();

        CareTaskEntity task = tasks.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(task.getTitle()).isEqualTo("Moi");
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
    void listAndCountAreScopedToTheTank() {
        long userId = newUser("a@example.com");
        long tankA = newTank(userId, "A");
        long tankB = newTank(userId, "B");
        newTask(tankA, "1");
        newTask(tankA, "2");
        newTask(tankB, "3");

        assertThat(tasks.countByTankId(tankA)).isEqualTo(2);
        assertThat(tasks.findAllByTankId(tankA)).extracting(CareTaskEntity::getTitle).containsExactly("1", "2");
    }

    @Test
    void deleteRemovesTheTask() {
        long userId = newUser("a@example.com");
        long id = newTask(newTank(userId, "Be"), "Cho an");

        assertThat(tasks.deleteByIdAndUserId(id, userId)).isTrue();
        assertThat(tasks.findByIdAndUserId(id, userId)).isEmpty();
    }
}
