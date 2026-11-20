package com.fishcaring.entity;

import com.fishcaring.enums.FishStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of the {@code tank_fish} table. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TankFishEntity {

    private Long id;
    private Long tankId;
    private String speciesName;
    private Integer quantity;
    private FishStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
