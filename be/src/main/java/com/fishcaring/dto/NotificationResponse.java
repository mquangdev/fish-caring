package com.fishcaring.dto;

import com.fishcaring.enums.NotificationStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** An in-app notification. {@code dueAt} is the due time of the task the notification is about. */
@Getter
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private final Long id;
    private final Long taskId;
    private final String message;
    private final NotificationStatus status;
    private final LocalDateTime dueAt;
    private final LocalDateTime createdAt;
}
