package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class TankVolumeCalculatorTest {

    private static BigDecimal volume(String length, String width, String height) {
        return TankVolumeCalculator.calculate(new BigDecimal(length), new BigDecimal(width), new BigDecimal(height));
    }

    @Test
    void multipliesTheDimensionsAndConvertsCubicCentimetresToLitres() {
        assertThat(volume("60", "30", "36")).isEqualByComparingTo("64.8");
        assertThat(volume("100", "50", "50")).isEqualByComparingTo("250.0");
        assertThat(volume("10", "10", "10")).isEqualByComparingTo("1.0");
    }

    @Test
    void resultAlwaysHasOneDecimalPlace() {
        assertThat(volume("100", "50", "50").scale()).isEqualTo(1);
        assertThat(volume("60", "30", "36").scale()).isEqualTo(1);
    }

    @Test
    void roundsHalfUpToOneDecimal() {
        // 1004.85 cm3 = 1.00485 L: below the half, rounds down
        assertThat(volume("10.5", "10", "9.57")).isEqualByComparingTo("1.0");
        // 1050 cm3 = 1.05 L: exactly on the half, rounds up
        assertThat(volume("10.5", "10", "10")).isEqualByComparingTo("1.1");
        // 49.321 cm3 = 0.049 L rounds down; 50 cm3 = 0.05 L rounds up
        assertThat(volume("3.1", "4.3", "3.7")).isEqualByComparingTo("0.0");
        assertThat(volume("5", "5", "2")).isEqualByComparingTo("0.1");
    }

    @Test
    void worksWithDecimalDimensions() {
        assertThat(volume("45.5", "30.2", "40.1")).isEqualByComparingTo("55.1");
    }

    @Test
    void largestAllowedDimensionsStayExact() {
        assertThat(volume("1000", "1000", "1000")).isEqualByComparingTo("1000000.0");
        assertThat(volume("0.1", "0.1", "0.1")).isEqualByComparingTo("0.0");
    }

    @Test
    void limitsAreTheDocumentedOnes() {
        assertThat(TankVolumeCalculator.MIN_VOLUME_LITERS).isEqualByComparingTo("0.1");
        assertThat(TankVolumeCalculator.MAX_VOLUME_LITERS).isEqualByComparingTo("10000");
    }
}
