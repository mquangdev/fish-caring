package com.fishcaring.object;

import com.fishcaring.enums.TankType;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** Editable tank fields, used when inserting or updating a tank. */
@Getter
@AllArgsConstructor
@Builder
public class TankData {

    private final String name;
    private final Integer volumeLiters;
    private final TankType type;
    private final LocalDate setupDate;
    private final String note;
}
