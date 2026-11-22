package com.fishcaring.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Body of {@code POST /api/tanks} and {@code PUT /api/tanks/{id}}.
 *
 * <p>Size: send either the three dimensions (all or none) and the server calculates the volume, or
 * only {@code volumeLiters}. When dimensions are present, {@code volumeLiters} is ignored.
 *
 * <p>{@code fish} lists the tank's whole fish list in display order (newest first); a PUT replaces
 * the stored list.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TankRequest {

    @NotBlank
    @Size(max = 100)
    private String name;

    @DecimalMin("0.1")
    @DecimalMax("10000")
    @Digits(integer = 5, fraction = 1)
    private BigDecimal volumeLiters;

    @DecimalMin("0.1")
    @DecimalMax("1000")
    @Digits(integer = 4, fraction = 1)
    private BigDecimal lengthCm;

    @DecimalMin("0.1")
    @DecimalMax("1000")
    @Digits(integer = 4, fraction = 1)
    private BigDecimal widthCm;

    @DecimalMin("0.1")
    @DecimalMax("1000")
    @Digits(integer = 4, fraction = 1)
    private BigDecimal heightCm;

    private LocalDate setupDate;

    @Size(max = 1000)
    private String note;

    @Size(max = 50)
    private List<@Valid @NotNull FishRequest> fish;
}
