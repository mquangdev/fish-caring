package com.fishcaring.dto;

import com.fishcaring.enums.CareResult;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** One line of the care history. {@code tankId} is null for a task without a tank. */
@Getter
@AllArgsConstructor
@Builder
public class CareLogResponse {

    private final Long id;
    private final Long tankId;
    private final Long taskId;
    private final String taskTitle;
    private final CareResult result;
    private final LocalDateTime dueAt;
    private final LocalDateTime actedAt;
}
