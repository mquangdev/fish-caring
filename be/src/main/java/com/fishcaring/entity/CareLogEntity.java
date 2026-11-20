package com.fishcaring.entity;

import com.fishcaring.enums.CareResult;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of the {@code care_logs} table. {@code taskId} is null once the task has been deleted. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CareLogEntity {

    private Long id;
    private Long tankId;
    private Long taskId;
    private String taskTitle;
    private CareResult result;
    private LocalDateTime dueAt;
    private LocalDateTime actedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
