package com.fishcaring.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** A tank with its fish (newest first). Never contains the owner's id. */
@Getter
@AllArgsConstructor
@Builder
public class TankResponse {

    private final Long id;
    private final String name;
    private final BigDecimal volumeLiters;
    private final BigDecimal lengthCm;
    private final BigDecimal widthCm;
    private final BigDecimal heightCm;
    private final LocalDate setupDate;
    private final String note;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final List<FishResponse> fish;
}
