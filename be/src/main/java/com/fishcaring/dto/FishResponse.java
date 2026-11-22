package com.fishcaring.dto;

import com.fishcaring.enums.FishStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class FishResponse {

    private final Long id;
    private final String speciesName;
    private final Integer quantity;
    private final FishStatus status;
}
