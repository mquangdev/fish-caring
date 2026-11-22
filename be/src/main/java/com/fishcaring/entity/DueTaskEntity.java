package com.fishcaring.entity;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A task that is about to be due (or overdue) and has no notification yet. {@code tankName} is null without a tank. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DueTaskEntity {

    private Long taskId;
    private Long userId;
    private String title;
    private String tankName;
    private LocalDateTime dueAt;
}
