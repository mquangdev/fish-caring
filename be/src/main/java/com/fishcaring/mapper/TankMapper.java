package com.fishcaring.mapper;

import com.fishcaring.dto.FishRequest;
import com.fishcaring.dto.FishResponse;
import com.fishcaring.dto.TankRequest;
import com.fishcaring.dto.TankResponse;
import com.fishcaring.dto.TankSummaryResponse;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.entity.TankFishEntity;
import com.fishcaring.entity.TankSummaryEntity;
import com.fishcaring.object.TankData;
import com.fishcaring.object.TankFishData;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class TankMapper {

    /** {@code volumeLiters} is the final volume decided by the service (calculated or as given). */
    public TankData toData(TankRequest request, BigDecimal volumeLiters) {
        return TankData.builder()
                .name(request.getName().trim())
                .volumeLiters(volumeLiters)
                .lengthCm(request.getLengthCm())
                .widthCm(request.getWidthCm())
                .heightCm(request.getHeightCm())
                .setupDate(request.getSetupDate())
                .note(blankToNull(request.getNote()))
                .build();
    }

    public TankFishData toFishData(FishRequest request) {
        return TankFishData.builder()
                .speciesName(request.getSpeciesName().trim())
                .quantity(request.getQuantity())
                .status(request.getStatus())
                .build();
    }

    public TankResponse toResponse(TankEntity tank, List<TankFishEntity> fish) {
        return TankResponse.builder()
                .id(tank.getId())
                .name(tank.getName())
                .volumeLiters(tank.getVolumeLiters())
                .lengthCm(tank.getLengthCm())
                .widthCm(tank.getWidthCm())
                .heightCm(tank.getHeightCm())
                .setupDate(tank.getSetupDate())
                .note(tank.getNote())
                .createdAt(tank.getCreatedAt())
                .updatedAt(tank.getUpdatedAt())
                .fish(fish.stream().map(this::toFishResponse).toList())
                .build();
    }

    public FishResponse toFishResponse(TankFishEntity fish) {
        return FishResponse.builder()
                .id(fish.getId())
                .speciesName(fish.getSpeciesName())
                .quantity(fish.getQuantity())
                .status(fish.getStatus())
                .build();
    }

    public TankSummaryResponse toSummary(TankSummaryEntity tank) {
        return TankSummaryResponse.builder()
                .id(tank.getId())
                .name(tank.getName())
                .volumeLiters(tank.getVolumeLiters())
                .taskCount(tank.getTaskCount())
                .nextDueAt(tank.getNextDueAt())
                .build();
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
