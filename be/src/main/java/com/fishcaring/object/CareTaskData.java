package com.fishcaring.object;

import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** Editable care task fields, used when inserting or updating a task. */
@Getter
@AllArgsConstructor
@Builder
public class CareTaskData {

    /** The tank the task belongs to, or null for a general task. */
    private final Long tankId;
    private final TaskType type;
    private final String title;
    private final String note;
    private final RepeatType repeatType;
    private final Integer intervalDays;
    private final LocalTime timeOfDay;
    private final LocalDate startDate;
    private final String foodName;
    private final Integer waterChangePercent;
    private final BigDecimal fertilizerMl;
    private final Boolean enabled;
    private final LocalDateTime nextDueAt;
}
