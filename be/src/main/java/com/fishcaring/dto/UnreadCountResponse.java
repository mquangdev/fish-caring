package com.fishcaring.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Body of {@code GET /api/notifications/unread-count}. */
@Getter
@AllArgsConstructor
public class UnreadCountResponse {

    private final int count;
}
