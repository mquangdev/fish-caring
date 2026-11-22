package com.fishcaring.entity;

import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of the "today" query: an enabled task with the name of its tank (null for a general task). */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TodayItemEntity {

    private Long id;
    private Long tankId;
    private String tankName;
    private TaskType type;
    private String title;
    private String note;
    private RepeatType repeatType;
    private LocalTime timeOfDay;
    private String foodName;
    private Integer waterChangePercent;
    private BigDecimal fertilizerMl;
    private LocalDateTime nextDueAt;
}
