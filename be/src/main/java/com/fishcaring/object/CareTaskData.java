package com.fishcaring.object;

import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
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

    private final TaskType type;
    private final String title;
    private final String note;
    private final RepeatType repeatType;
    private final Integer intervalDays;
    private final LocalTime timeOfDay;
    private final LocalDate startDate;
    private final Boolean enabled;
    private final LocalDateTime nextDueAt;
}
