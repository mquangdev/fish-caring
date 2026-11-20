package com.fishcaring.entity;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of the {@code push_subscriptions} table. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PushSubscriptionEntity {

    private Long id;
    private Long userId;
    private String endpoint;
    private String p256dh;
    private String auth;
    private String userAgent;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
