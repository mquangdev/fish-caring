package com.fishcaring.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Volume of a rectangular tank. Dimensions are in centimetres, the result is in litres rounded half
 * up to one decimal place (60 x 30 x 36 cm = 64.8 L). The frontend uses the same formula.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TankVolumeCalculator {

    public static final BigDecimal MIN_VOLUME_LITERS = new BigDecimal("0.1");
    public static final BigDecimal MAX_VOLUME_LITERS = new BigDecimal("10000");

    private static final BigDecimal CUBIC_CM_PER_LITER = BigDecimal.valueOf(1000);

    public static BigDecimal calculate(BigDecimal lengthCm, BigDecimal widthCm, BigDecimal heightCm) {
        return lengthCm.multiply(widthCm).multiply(heightCm)
                .divide(CUBIC_CM_PER_LITER, 1, RoundingMode.HALF_UP);
    }
}
