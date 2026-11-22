package com.fishcaring.entity;

import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of the {@code care_tasks} table. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CareTaskEntity {

    private Long id;
    private Long userId;
    private Long tankId;
    private TaskType type;
    private String title;
    private String note;
    private RepeatType repeatType;
    private Integer intervalDays;
    private LocalTime timeOfDay;
    private LocalDate startDate;
    private String foodName;
    private Integer waterChangePercent;
    private BigDecimal fertilizerMl;
    private Boolean enabled;
    private LocalDateTime nextDueAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
