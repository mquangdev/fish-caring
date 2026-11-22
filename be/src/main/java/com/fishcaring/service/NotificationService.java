package com.fishcaring.service;

import com.fishcaring.dto.NotificationResponse;
import com.fishcaring.entity.DueTaskEntity;
import com.fishcaring.exception.NotFoundException;
import com.fishcaring.mapper.NotificationMapper;
import com.fishcaring.repository.NotificationRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

/**
 * In-app notifications. A notification is created {@link #LEAD_TIME} before the due time of an
 * enabled task, once per due time, and is resolved when the task is done, snoozed, turned off or
 * rescheduled. Every read is scoped to the given user.
 */
@Slf4j
@Service
public class NotificationService {

    /** How long before the due time the notification is created. */
    static final Duration LEAD_TIME = Duration.ofMinutes(30);
    static final int BATCH_SIZE = 500;
    static final int DEFAULT_LIMIT = 50;
    static final int MAX_LIMIT = 100;
    private static final String GENERAL = "Việc chung";
    private static final DateTimeFormatter HOUR_MINUTE = DateTimeFormatter.ofPattern("HH:mm");

    private final NotificationRepository notifications;
    private final NotificationMapper mapper;
    private final Clock clock;

    public NotificationService(NotificationRepository notifications, NotificationMapper mapper, Clock clock) {
        this.notifications = notifications;
        this.mapper = mapper;
        this.clock = clock;
    }

    /**
     * Creates the notifications that are due now: one for every enabled task that is due within the lead
     * time (or overdue) and has no unresolved notification. Safe to run again and again. Returns how many
     * were created.
     */
    public int createDueNotifications() {
        LocalDateTime now = LocalDateTime.now(clock);
        int created = 0;
        for (DueTaskEntity task : notifications.findDueWithoutOpenNotification(now.plus(LEAD_TIME), BATCH_SIZE)) {
            try {
                notifications.insert(task.getUserId(), task.getTaskId(), task.getDueAt(), message(task, now), now);
                created++;
            } catch (DuplicateKeyException e) {
                // a notification for exactly this due time already exists (for example it was resolved)
                log.debug("Notification for task {} due {} already exists", task.getTaskId(), task.getDueAt());
            }
        }
        return created;
    }

    public List<NotificationResponse> list(long userId, Integer limit) {
        return notifications.findRecentByUserId(userId, clamp(limit)).stream().map(mapper::toResponse).toList();
    }

    public int unreadCount(long userId) {
        return notifications.countUnread(userId);
    }

    /** Marks one notification as read. Someone else's notification is 404; an already read one stays as it is. */
    public void markRead(long userId, long id) {
        if (notifications.findByIdAndUserId(id, userId).isEmpty()) {
            throw new NotFoundException("Notification not found");
        }
        notifications.markRead(id, userId, LocalDateTime.now(clock));
    }

    public void markAllRead(long userId) {
        notifications.markAllRead(userId, LocalDateTime.now(clock));
    }

    /** "Bể 1: sắp đến giờ cho ăn (08:00)" before the due time, "Bể 1: đến giờ cho ăn" from then on. */
    static String message(DueTaskEntity task, LocalDateTime now) {
        String where = task.getTankName() == null ? GENERAL : task.getTankName();
        String title = lowerFirst(task.getTitle());
        if (task.getDueAt().isAfter(now)) {
            return where + ": sắp đến giờ " + title + " (" + task.getDueAt().format(HOUR_MINUTE) + ")";
        }
        return where + ": đến giờ " + title;
    }

    private static String lowerFirst(String text) {
        return text.isEmpty() ? text : Character.toLowerCase(text.charAt(0)) + text.substring(1);
    }

    /** No limit means 50; anything outside 1 to 100 is moved into that range. */
    static int clamp(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        return Math.max(1, Math.min(MAX_LIMIT, limit));
    }
}
