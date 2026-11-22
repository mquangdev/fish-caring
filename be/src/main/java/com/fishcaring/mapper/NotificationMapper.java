package com.fishcaring.mapper;

import com.fishcaring.dto.NotificationResponse;
import com.fishcaring.entity.NotificationEntity;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    public NotificationResponse toResponse(NotificationEntity notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .taskId(notification.getTaskId())
                .message(notification.getMessage())
                .status(notification.getStatus())
                .dueAt(notification.getDueAt())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
