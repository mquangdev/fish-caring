package com.fishcaring.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** A task on the "today" screen. {@code tankName} is null for a task without a tank. */
@Getter
@AllArgsConstructor
@Builder
public class TodayItemResponse {

    private final Long id;
    private final Long tankId;
    private final String tankName;
    private final TaskType type;
    private final String title;
    private final String note;
    private final RepeatType repeatType;
    @JsonFormat(pattern = "HH:mm")
    private final LocalTime timeOfDay;
    private final String foodName;
    private final Integer waterChangePercent;
    private final BigDecimal fertilizerMl;
    private final LocalDateTime nextDueAt;
}
