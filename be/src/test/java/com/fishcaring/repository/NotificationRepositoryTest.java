package com.fishcaring.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fishcaring.RepositoryTestSupport;
import com.fishcaring.entity.NotificationEntity;
import com.fishcaring.enums.NotificationStatus;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

class NotificationRepositoryTest extends RepositoryTestSupport {

    @Test
    void insertCreatesUnreadNotification() {
        long userId = newUser("a@example.com");
        long taskId = newTask(newTank(userId, "Be"), "Cho an");

        long id = notifications.insert(userId, taskId, NOW, "Den gio cho an", NOW);

        NotificationEntity row = notifications.findByIdAndUserId(id, userId).orElseThrow();
        assertThat(row.getStatus()).isEqualTo(NotificationStatus.UNREAD);
        assertThat(row.getMessage()).isEqualTo("Den gio cho an");
        assertThat(row.getDueAt()).isEqualTo(NOW);
        assertThat(row.getCreatedAt()).isEqualTo(NOW);
        assertThat(row.getUpdatedAt()).isEqualTo(NOW);
    }

    @Test
    void oneNotificationPerTaskAndDueAt() {
        long userId = newUser("a@example.com");
        long taskId = newTask(newTank(userId, "Be"), "Cho an");
        notifications.insert(userId, taskId, NOW, "Den gio", NOW);

        assertThatThrownBy(() -> notifications.insert(userId, taskId, NOW, "Den gio", NOW.plusMinutes(1)))
                .isInstanceOf(DuplicateKeyException.class);

        LocalDateTime nextDay = NOW.plusDays(1);
        assertThat(notifications.insert(userId, taskId, nextDay, "Den gio", nextDay)).isPositive();
    }

    @Test
    void otherUsersCannotReadMyNotification() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long taskId = newTask(newTank(alice, "Be"), "Cho an");
        long id = notifications.insert(alice, taskId, NOW, "Den gio", NOW);

        assertThat(notifications.findByIdAndUserId(id, bob)).isEmpty();
        assertThat(notifications.findRecentByUserId(bob, 10)).isEmpty();
    }

    @Test
    void recentAreNewestFirstAndRespectLimit() {
        long userId = newUser("a@example.com");
        long taskId = newTask(newTank(userId, "Be"), "Cho an");
        long first = notifications.insert(userId, taskId, NOW, "1", NOW);
        long second = notifications.insert(userId, taskId, NOW.plusDays(1), "2", NOW.plusDays(1));
        long third = notifications.insert(userId, taskId, NOW.plusDays(2), "3", NOW.plusDays(2));

        assertThat(notifications.findRecentByUserId(userId, 10)).extracting(NotificationEntity::getId)
                .containsExactly(third, second, first);
        assertThat(notifications.findRecentByUserId(userId, 2)).extracting(NotificationEntity::getId)
                .containsExactly(third, second);
    }

    @Test
    void countsOnlyTheUnreadOnesOfTheUser() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long task = newTask(newTank(alice, "Be"), "Cho an");
        long other = newGeneralTask(bob, "Cua Bob");
        long first = notifications.insert(alice, task, NOW, "1", NOW);
        notifications.insert(alice, task, NOW.plusDays(1), "2", NOW);
        notifications.insert(bob, other, NOW, "3", NOW);
        notifications.markRead(first, alice, NOW);

        assertThat(notifications.countUnread(alice)).isEqualTo(1);
        assertThat(notifications.countUnread(bob)).isEqualTo(1);
    }

    @Test
    void markReadChangesOnlyAnUnreadNotificationOfTheUser() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long task = newTask(newTank(alice, "Be"), "Cho an");
        long id = notifications.insert(alice, task, NOW, "1", NOW);

        assertThat(notifications.markRead(id, bob, NOW)).isFalse();
        assertThat(notifications.findByIdAndUserId(id, alice).orElseThrow().getStatus())
                .isEqualTo(NotificationStatus.UNREAD);

        assertThat(notifications.markRead(id, alice, NOW.plusMinutes(1))).isTrue();
        NotificationEntity row = notifications.findByIdAndUserId(id, alice).orElseThrow();
        assertThat(row.getStatus()).isEqualTo(NotificationStatus.READ);
        assertThat(row.getUpdatedAt()).isEqualTo(NOW.plusMinutes(1));
        assertThat(notifications.markRead(id, alice, NOW)).isFalse();
    }

    @Test
    void markAllReadDoesNotTouchResolvedOrOtherUsers() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        long task = newTask(newTank(alice, "Be"), "Cho an");
        long bobTask = newGeneralTask(bob, "Cua Bob");
        long old = notifications.insert(alice, task, NOW, "1", NOW);
        long bobs = notifications.insert(bob, bobTask, NOW, "3", NOW);
        notifications.resolveOpenByTaskId(task, NOW);
        long open = notifications.insert(alice, task, NOW.plusDays(2), "4", NOW);

        assertThat(notifications.markAllRead(alice, NOW)).isEqualTo(1);

        assertThat(notifications.findByIdAndUserId(open, alice).orElseThrow().getStatus())
                .isEqualTo(NotificationStatus.READ);
        assertThat(notifications.findByIdAndUserId(old, alice).orElseThrow().getStatus())
                .isEqualTo(NotificationStatus.RESOLVED);
        assertThat(notifications.findByIdAndUserId(bobs, bob).orElseThrow().getStatus())
                .isEqualTo(NotificationStatus.UNREAD);
    }

    @Test
    void resolveOpenByTaskIdResolvesUnreadAndReadOfThatTaskOnly() {
        long userId = newUser("a@example.com");
        long tank = newTank(userId, "Be");
        long task = newTask(tank, "Cho an");
        long otherTask = newTask(tank, "Thay nuoc");
        long unread = notifications.insert(userId, task, NOW, "1", NOW);
        long read = notifications.insert(userId, task, NOW.plusDays(1), "2", NOW);
        notifications.markRead(read, userId, NOW);
        long untouched = notifications.insert(userId, otherTask, NOW, "3", NOW);

        assertThat(notifications.resolveOpenByTaskId(task, NOW.plusMinutes(1))).isEqualTo(2);

        assertThat(notifications.findByIdAndUserId(unread, userId).orElseThrow().getStatus())
                .isEqualTo(NotificationStatus.RESOLVED);
        assertThat(notifications.findByIdAndUserId(read, userId).orElseThrow().getStatus())
                .isEqualTo(NotificationStatus.RESOLVED);
        assertThat(notifications.findByIdAndUserId(untouched, userId).orElseThrow().getStatus())
                .isEqualTo(NotificationStatus.UNREAD);
        assertThat(notifications.resolveOpenByTaskId(task, NOW)).isZero();
    }

    private void dueAt(long taskId, LocalDateTime due) {
        jdbc.sql("UPDATE care_tasks SET next_due_at = :d WHERE id = :id").param("d", due).param("id", taskId).update();
    }

    @Test
    void dueQueryReturnsEnabledTasksUpToTheLimitTimeWithoutAnOpenNotificationOldestFirst() {
        long alice = newUser("a@example.com");
        long tank = newTank(alice, "Be 1");
        long soon = newTask(tank, "Sap toi");
        long overdue = newGeneralTask(alice, "Qua han");
        long later = newTask(tank, "Muon");
        long off = newTask(tank, "Tat");
        long notified = newTask(tank, "Da bao");
        dueAt(soon, NOW.plusMinutes(20));
        dueAt(overdue, NOW.minusDays(2));
        dueAt(later, NOW.plusMinutes(31));
        dueAt(off, NOW);
        jdbc.sql("UPDATE care_tasks SET enabled = FALSE WHERE id = :id").param("id", off).update();
        dueAt(notified, NOW);
        notifications.insert(alice, notified, NOW, "x", NOW);

        var due = notifications.findDueWithoutOpenNotification(NOW.plusMinutes(30), 10);

        assertThat(due).extracting(d -> d.getTitle()).containsExactly("Qua han", "Sap toi");
        assertThat(due.get(0).getTankName()).isNull();
        assertThat(due.get(1).getTankName()).isEqualTo("Be 1");
        assertThat(due.get(1).getUserId()).isEqualTo(alice);
        assertThat(notifications.findDueWithoutOpenNotification(NOW.plusMinutes(30), 1)).hasSize(1);
    }
}
