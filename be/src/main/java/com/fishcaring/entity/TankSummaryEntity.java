package com.fishcaring.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A tank row joined with its task count and earliest due time, used by the tank list. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TankSummaryEntity {

    private Long id;
    private String name;
    private BigDecimal volumeLiters;
    private LocalDateTime createdAt;
    private Integer taskCount;
    private LocalDateTime nextDueAt;
}
