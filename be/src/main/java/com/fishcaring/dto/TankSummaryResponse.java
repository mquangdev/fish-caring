package com.fishcaring.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** One entry of the tank list. */
@Getter
@AllArgsConstructor
@Builder
public class TankSummaryResponse {

    private final Long id;
    private final String name;
    private final BigDecimal volumeLiters;
    private final Integer taskCount;
    /** Earliest due time among the tank's enabled tasks, or null when there is none. */
    private final LocalDateTime nextDueAt;
}
