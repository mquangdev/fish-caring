package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fishcaring.RepositoryTestSupport;
import com.fishcaring.entity.NotificationEntity;
import com.fishcaring.enums.NotificationStatus;
import com.fishcaring.mapper.NotificationMapper;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * The creation of notifications against real SQL on H2: which tasks get one, when, with what text.
 * The clock is fixed at {@code NOW} (2026-11-21 08:00), the lead time is 30 minutes.
 */
class NotificationCreationTest extends RepositoryTestSupport {

    private NotificationService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW.toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
        service = new NotificationService(notifications, new NotificationMapper(), clock);
    }

    private void dueAt(long taskId, LocalDateTime due) {
        jdbc.sql("UPDATE care_tasks SET next_due_at = :due WHERE id = :id").param("due", due).param("id", taskId).update();
    }

    private List<NotificationEntity> all(long userId) {
        return notifications.findRecentByUserId(userId, 100);
    }

    // ---- the 30 minute lead time ----

    @Test
    void createsTheNotificationThirtyMinutesBeforeTheDueTimeButNotEarlier() {
        long userId = newUser("a@example.com");
        long task = newTask(newTank(userId, "Be 1"), "Cho an");

        dueAt(task, NOW.plusMinutes(31));
        assertThat(service.createDueNotifications()).isZero();

        dueAt(task, NOW.plusMinutes(30).plusSeconds(1));
        assertThat(service.createDueNotifications()).isZero();

        dueAt(task, NOW.plusMinutes(30));
        assertThat(service.createDueNotifications()).isEqualTo(1);
        assertThat(all(userId)).hasSize(1);
    }

    @Test
    void createsOneForATaskThatIsAlreadyDueOrOverdue() {
        long userId = newUser("a@example.com");
        dueAt(newTask(newTank(userId, "Be 1"), "Cho an"), NOW.minusMinutes(5));
        dueAt(newTask(newTank(userId, "Be 1"), "Thay nuoc"), NOW.minusDays(4));

        assertThat(service.createDueNotifications()).isEqualTo(2);
    }

    @Test
    void theNotificationKeepsTheRealDueTimeNotTheCreationTime() {
        long userId = newUser("a@example.com");
        dueAt(newTask(newTank(userId, "Be 1"), "Cho an"), NOW.plusMinutes(20));

        service.createDueNotifications();

        NotificationEntity row = all(userId).get(0);
        assertThat(row.getDueAt()).isEqualTo(NOW.plusMinutes(20));
        assertThat(row.getCreatedAt()).isEqualTo(NOW);
        assertThat(row.getStatus()).isEqualTo(NotificationStatus.UNREAD);
    }

    // ---- once per due time ----

    @Test
    void runningTwiceCreatesOnlyOneNotification() {
        long userId = newUser("a@example.com");
        dueAt(newTask(newTank(userId, "Be 1"), "Cho an"), NOW.plusMinutes(10));

        assertThat(service.createDueNotifications()).isEqualTo(1);
        assertThat(service.createDueNotifications()).isZero();

        assertThat(all(userId)).hasSize(1);
    }

    @Test
    void aTaskOverdueForDaysHasOneNotificationNoMatterHowOftenItRuns() {
        long userId = newUser("a@example.com");
        long task = newTask(newTank(userId, "Be 1"), "Cho an");
        dueAt(task, NOW.minusDays(3));
        service.createDueNotifications();

        // a day later the task is still not done and its due time has not moved
        Clock later = Clock.fixed(NOW.plusDays(1).toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
        assertThat(new NotificationService(notifications, new NotificationMapper(), later).createDueNotifications())
                .isZero();

        assertThat(all(userId)).hasSize(1);
    }

    @Test
    void aReadNotificationStillBlocksANewOneUntilItIsResolved() {
        long userId = newUser("a@example.com");
        long task = newTask(newTank(userId, "Be 1"), "Cho an");
        dueAt(task, NOW.minusMinutes(1));
        service.createDueNotifications();
        service.markAllRead(userId);

        dueAt(task, NOW.minusMinutes(2));
        assertThat(service.createDueNotifications()).isZero();

        notifications.resolveOpenByTaskId(task, NOW);
        dueAt(task, NOW.plusMinutes(5));
        assertThat(service.createDueNotifications()).isEqualTo(1);
        assertThat(all(userId)).hasSize(2);
    }

    @Test
    void aSnoozedTaskGetsANewNotificationOnlyThirtyMinutesBeforeTheNewTime() {
        long userId = newUser("a@example.com");
        long task = newTask(newTank(userId, "Be 1"), "Cho an");
        dueAt(task, NOW.plusMinutes(10));
        service.createDueNotifications();

        // snoozed: resolved, and due again tomorrow at the same time
        notifications.resolveOpenByTaskId(task, NOW);
        dueAt(task, NOW.plusMinutes(10).plusDays(1));
        assertThat(service.createDueNotifications()).isZero();

        // the new due time is tomorrow 08:10, so the notification appears from tomorrow 07:40
        Clock tomorrow = Clock.fixed(NOW.plusDays(1).minusMinutes(20).toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
        assertThat(new NotificationService(notifications, new NotificationMapper(), tomorrow).createDueNotifications())
                .isEqualTo(1);
        assertThat(all(userId)).hasSize(2);
    }

    @Test
    void aResolvedNotificationForTheSameDueTimeIsNotDuplicatedAndDoesNotStopTheBatch() {
        long userId = newUser("a@example.com");
        long first = newTask(newTank(userId, "Be 1"), "Cho an");
        long second = newTask(newTank(userId, "Be 1"), "Thay nuoc");
        dueAt(first, NOW.plusMinutes(10));
        dueAt(second, NOW.plusMinutes(12));
        service.createDueNotifications();
        notifications.resolveOpenByTaskId(first, NOW);

        // first is edited back to the very same due time: the unique key refuses a second row for it
        assertThat(service.createDueNotifications()).isZero();
        dueAt(second, NOW.plusMinutes(15));
        notifications.resolveOpenByTaskId(second, NOW);
        assertThat(service.createDueNotifications()).isEqualTo(1);
    }

    // ---- which tasks ----

    @Test
    void aTurnedOffTaskGetsNoNotification() {
        long userId = newUser("a@example.com");
        long task = newTask(newTank(userId, "Be 1"), "Cho an");
        dueAt(task, NOW.minusMinutes(5));
        tasks.setEnabled(task, userId, false, null, NOW);

        assertThat(service.createDueNotifications()).isZero();
        // a turned-off task keeps no due time; even with one it is not notified
        dueAt(task, NOW.minusMinutes(5));
        assertThat(service.createDueNotifications()).isZero();
    }

    @Test
    void everyUserGetsTheirOwnNotifications() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        dueAt(newTask(newTank(alice, "Be A"), "Cho an"), NOW.plusMinutes(5));
        dueAt(newGeneralTask(bob, "Chung cua Bob"), NOW.plusMinutes(5));

        assertThat(service.createDueNotifications()).isEqualTo(2);

        assertThat(all(alice)).hasSize(1);
        assertThat(all(alice).get(0).getMessage()).contains("Be A");
        assertThat(all(bob)).hasSize(1);
        assertThat(all(bob).get(0).getMessage()).startsWith("Việc chung");
    }

    // ---- the text ----

    @Test
    void theTextSaysSoonWithTheHourBeforeTheDueTimeAndNowFromThen() {
        long userId = newUser("a@example.com");
        dueAt(newTask(newTank(userId, "Bể Mini 30L"), "Cho ăn"), LocalDateTime.of(2026, 11, 21, 8, 15));
        dueAt(newTask(newTank(userId, "Bể Mini 30L"), "Thay nước"), NOW.minusMinutes(1));
        dueAt(newGeneralTask(userId, "Thay nước trùn chỉ"), LocalDateTime.of(2026, 11, 21, 8, 5));

        service.createDueNotifications();

        assertThat(all(userId)).extracting(NotificationEntity::getMessage).containsExactlyInAnyOrder(
                "Bể Mini 30L: sắp đến giờ cho ăn (08:15)",
                "Bể Mini 30L: đến giờ thay nước",
                "Việc chung: sắp đến giờ thay nước trùn chỉ (08:05)");
    }
}
