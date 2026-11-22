package com.fishcaring.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.fishcaring.dto.FishRequest;
import com.fishcaring.dto.TankRequest;
import com.fishcaring.dto.TankResponse;
import com.fishcaring.dto.TankSummaryResponse;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.entity.TankFishEntity;
import com.fishcaring.entity.TankSummaryEntity;
import com.fishcaring.enums.FishStatus;
import com.fishcaring.object.TankData;
import com.fishcaring.object.TankFishData;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class TankMapperTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 21, 8, 0);

    private final TankMapper mapper = new TankMapper();

    @Test
    void requestBecomesDataWithTrimmedNameAndBlankNoteAsNull() {
        TankRequest request = new TankRequest("  Be thuy sinh  ", new BigDecimal("99"), new BigDecimal("60"),
                new BigDecimal("30"), new BigDecimal("36"), LocalDate.of(2026, 1, 15), "   ", null);

        TankData data = mapper.toData(request, new BigDecimal("64.8"));

        assertThat(data.getName()).isEqualTo("Be thuy sinh");
        // the volume decided by the service wins over the one in the request
        assertThat(data.getVolumeLiters()).isEqualByComparingTo("64.8");
        assertThat(data.getLengthCm()).isEqualByComparingTo("60");
        assertThat(data.getWidthCm()).isEqualByComparingTo("30");
        assertThat(data.getHeightCm()).isEqualByComparingTo("36");
        assertThat(data.getSetupDate()).isEqualTo(LocalDate.of(2026, 1, 15));
        assertThat(data.getNote()).isNull();
    }

    @Test
    void noteIsKeptWhenPresent() {
        TankRequest request = new TankRequest("Be", null, null, null, null, null, "  ghi chu  ", null);

        assertThat(mapper.toData(request, null).getNote()).isEqualTo("ghi chu");
    }

    @Test
    void fishRequestBecomesFishDataWithTrimmedSpecies() {
        TankFishData data = mapper.toFishData(new FishRequest("  Neon  ", 5, FishStatus.DEAD));

        assertThat(data.getSpeciesName()).isEqualTo("Neon");
        assertThat(data.getQuantity()).isEqualTo(5);
        assertThat(data.getStatus()).isEqualTo(FishStatus.DEAD);
    }

    @Test
    void responseKeepsFishOrderAndNeverContainsTheOwner() {
        TankEntity tank = new TankEntity(7L, 99L, "Be", new BigDecimal("60.5"), new BigDecimal("60"), new BigDecimal("30"),
                new BigDecimal("36"), null, "ghi chu", NOW, NOW);
        List<TankFishEntity> fish = List.of(
                new TankFishEntity(3L, 7L, "Guppy", 4, FishStatus.ALIVE, NOW, NOW),
                new TankFishEntity(2L, 7L, "Neon", 10, FishStatus.DEAD, NOW, NOW));

        TankResponse response = mapper.toResponse(tank, fish);

        assertThat(response.getId()).isEqualTo(7L);
        assertThat(response.getVolumeLiters()).isEqualByComparingTo("60.5");
        assertThat(response.getLengthCm()).isEqualByComparingTo("60");
        assertThat(response.getHeightCm()).isEqualByComparingTo("36");
        assertThat(response.getFish()).extracting(f -> f.getSpeciesName()).containsExactly("Guppy", "Neon");
        assertThat(response.getFish().get(1).getStatus()).isEqualTo(FishStatus.DEAD);
        assertThat(TankResponse.class.getDeclaredFields()).extracting(f -> f.getName()).doesNotContain("userId");
    }

    @Test
    void summaryCopiesCountAndNextDue() {
        TankSummaryEntity entity = new TankSummaryEntity(7L, "Be", new BigDecimal("60.5"), NOW, 3, NOW.plusDays(1));

        TankSummaryResponse response = mapper.toSummary(entity);

        assertThat(response.getId()).isEqualTo(7L);
        assertThat(response.getTaskCount()).isEqualTo(3);
        assertThat(response.getNextDueAt()).isEqualTo(NOW.plusDays(1));
    }
}
