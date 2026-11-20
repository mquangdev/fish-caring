package com.fishcaring.entity;

import com.fishcaring.enums.TankType;
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
    private Integer volumeLiters;
    private TankType type;
    private LocalDate setupDate;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
