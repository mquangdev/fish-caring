package com.fishcaring.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** A care task. {@code nextDueAt} is null while the task is disabled. */
@Getter
@AllArgsConstructor
@Builder
public class TaskResponse {

    private final Long id;
    private final Long tankId;
    private final TaskType type;
    private final String title;
    private final String note;
    private final RepeatType repeatType;
    private final Integer intervalDays;
    @JsonFormat(pattern = "HH:mm")
    private final LocalTime timeOfDay;
    private final LocalDate startDate;
    private final String foodName;
    private final Integer waterChangePercent;
    private final BigDecimal fertilizerMl;
    private final Boolean enabled;
    private final LocalDateTime nextDueAt;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
}
