package com.fishcaring.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of the {@code tanks} table. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TankEntity {

    private Long id;
    private Long userId;
    private String name;
    private BigDecimal volumeLiters;
    private BigDecimal lengthCm;
    private BigDecimal widthCm;
    private BigDecimal heightCm;
    private LocalDate setupDate;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
