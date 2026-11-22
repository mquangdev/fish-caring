package com.fishcaring.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Body of {@code POST /api/tasks} and {@code PUT /api/tasks/{id}}. Only the optional detail
 * field that matches {@code type} is kept; the others are ignored. {@code intervalDays} and
 * {@code startDate} depend on {@code repeatType} (checked by the service).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TaskRequest {

    /** The tank the task belongs to; null for a general task. */
    private Long tankId;

    @NotNull
    private TaskType type;

    @NotBlank
    @Size(max = 100)
    private String title;

    @Size(max = 500)
    private String note;

    @NotNull
    private RepeatType repeatType;

    private Integer intervalDays;

    @NotNull
    @JsonFormat(pattern = "HH:mm")
    private LocalTime timeOfDay;

    private LocalDate startDate;

    @Size(max = 100)
    private String foodName;

    @Min(1)
    @Max(100)
    private Integer waterChangePercent;

    @DecimalMin("0.1")
    @DecimalMax("1000")
    @Digits(integer = 4, fraction = 1)
    private BigDecimal fertilizerMl;
}
