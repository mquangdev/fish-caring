package com.fishcaring.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Creates the due notifications every minute (and once at start-up). Turned off with
 * {@code app.scheduler.enabled=false}.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class NotificationScheduler {

    private final NotificationService notifications;

    public NotificationScheduler(NotificationService notifications) {
        this.notifications = notifications;
    }

    @Scheduled(fixedRate = 60_000)
    public void run() {
        try {
            int created = notifications.createDueNotifications();
            if (created > 0) {
                log.info("Created {} notification(s)", created);
            }
        } catch (RuntimeException e) {
            // never let one failed run stop the schedule
            log.error("Creating notifications failed", e);
        }
    }
}
