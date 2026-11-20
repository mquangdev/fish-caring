package com.fishcaring.object;

import com.fishcaring.enums.FishStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** One group of fish of the same species, used when inserting tank fish. */
@Getter
@AllArgsConstructor
@Builder
public class TankFishData {

    private final String speciesName;
    private final Integer quantity;
    private final FishStatus status;
}
