package com.fishcaring.object;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * Editable tank fields, used when inserting or updating a tank. {@code volumeLiters} is the final
 * volume to store; when the dimensions are present it has already been calculated from them.
 */
@Getter
@AllArgsConstructor
@Builder
public class TankData {

    private final String name;
    private final BigDecimal volumeLiters;
    private final BigDecimal lengthCm;
    private final BigDecimal widthCm;
    private final BigDecimal heightCm;
    private final LocalDate setupDate;
    private final String note;
}
