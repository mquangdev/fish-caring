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
}
