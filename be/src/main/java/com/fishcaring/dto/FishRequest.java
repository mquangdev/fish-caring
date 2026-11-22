package com.fishcaring.dto;

import com.fishcaring.enums.FishStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One group of fish of the same species inside {@link TankRequest}. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FishRequest {

    @NotBlank
    @Size(max = 100)
    private String speciesName;

    @NotNull
    @Min(1)
    @Max(9999)
    private Integer quantity;

    @NotNull
    private FishStatus status;
}
