package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fishcaring.dto.FishRequest;
import com.fishcaring.dto.TankRequest;
import com.fishcaring.dto.TankResponse;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.enums.FishStatus;
import com.fishcaring.exception.NotFoundException;
import com.fishcaring.exception.ValidationException;
import com.fishcaring.mapper.TankMapper;
import com.fishcaring.object.TankData;
import com.fishcaring.object.TankFishData;
import com.fishcaring.mapper.TaskMapper;
import com.fishcaring.repository.CareTaskRepository;
import com.fishcaring.repository.TankFishRepository;
import com.fishcaring.repository.TankRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TankServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-21T01:00:00Z"), ZoneOffset.UTC);
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 21, 1, 0);
    private static final long USER = 1L;
    private static final long OTHER_USER = 2L;
    private static final long TANK = 10L;

    @Mock
    private TankRepository tanks;
    @Mock
    private TankFishRepository fish;
    @Mock
    private CareTaskRepository careTasks;

    private TankService service;

    @BeforeEach
    void setUp() {
        service = new TankService(tanks, fish, careTasks, new TankMapper(), new TaskMapper(), CLOCK);
        TankEntity tank = new TankEntity(TANK, USER, "Be", new BigDecimal("60.0"), null, null, null, null, null, NOW, NOW);
        when(tanks.findByIdAndUserId(TANK, USER)).thenReturn(Optional.of(tank));
        when(tanks.findByIdAndUserId(TANK, OTHER_USER)).thenReturn(Optional.empty());
        when(tanks.insert(eq(USER), any(TankData.class), any())).thenReturn(TANK);
        when(fish.findAllByTankId(TANK)).thenReturn(List.of());
    }

    private TankRequest request(String name, FishRequest... fishRows) {
        return new TankRequest(name, new BigDecimal("60"), null, null, null, null, null, List.of(fishRows));
    }

    @Test
    void createTrimsTheNameAndUsesTheClock() {
        TankResponse response = service.create(USER, request("  Be moi  "));

        ArgumentCaptor<TankData> data = ArgumentCaptor.forClass(TankData.class);
        verify(tanks).insert(eq(USER), data.capture(), eq(NOW));
        assertThat(data.getValue().getName()).isEqualTo("Be moi");
        assertThat(response.getId()).isEqualTo(TANK);
    }

    private TankRequest sized(String volume, String length, String width, String height) {
        return new TankRequest("Be", volume == null ? null : new BigDecimal(volume),
                length == null ? null : new BigDecimal(length),
                width == null ? null : new BigDecimal(width),
                height == null ? null : new BigDecimal(height), null, null, List.of());
    }

    private TankData storedByCreate(TankRequest request) {
        service.create(USER, request);
        ArgumentCaptor<TankData> data = ArgumentCaptor.forClass(TankData.class);
        verify(tanks).insert(eq(USER), data.capture(), eq(NOW));
        return data.getValue();
    }

    @Test
    void withDimensionsTheServerCalculatesTheVolumeAndIgnoresTheOneSent() {
        TankData data = storedByCreate(sized("999", "60", "30", "36"));

        assertThat(data.getVolumeLiters()).isEqualByComparingTo("64.8");
        assertThat(data.getLengthCm()).isEqualByComparingTo("60");
        assertThat(data.getWidthCm()).isEqualByComparingTo("30");
        assertThat(data.getHeightCm()).isEqualByComparingTo("36");
    }

    @Test
    void withOnlyAVolumeItIsStoredAsGivenAndDimensionsStayEmpty() {
        TankData data = storedByCreate(sized("64.8", null, null, null));

        assertThat(data.getVolumeLiters()).isEqualByComparingTo("64.8");
        assertThat(data.getLengthCm()).isNull();
        assertThat(data.getWidthCm()).isNull();
        assertThat(data.getHeightCm()).isNull();
    }

    @Test
    void withNeitherTheSizeIsLeftEmpty() {
        TankData data = storedByCreate(sized(null, null, null, null));

        assertThat(data.getVolumeLiters()).isNull();
    }

    @Test
    void aPartialSetOfDimensionsIsRejectedWithTheMissingFieldNames() {
        assertThatThrownBy(() -> service.create(USER, sized(null, "60", null, null)))
                .isInstanceOfSatisfying(ValidationException.class, e ->
                        assertThat(e.getFieldErrors()).containsOnlyKeys("widthCm", "heightCm"));
        assertThatThrownBy(() -> service.create(USER, sized("64.8", "60", "30", null)))
                .isInstanceOfSatisfying(ValidationException.class, e ->
                        assertThat(e.getFieldErrors()).containsOnlyKeys("heightCm"));
        verify(tanks, never()).insert(anyLong(), any(TankData.class), any());
    }

    @Test
    void aCalculatedVolumeAboveTenThousandLitresIsRejected() {
        // 1000 x 1000 x 11 cm = 11 000 L
        assertThatThrownBy(() -> service.create(USER, sized(null, "1000", "1000", "11")))
                .isInstanceOfSatisfying(ValidationException.class, e ->
                        assertThat(e.getFieldErrors()).containsOnlyKeys("volumeLiters"));
        verify(tanks, never()).insert(anyLong(), any(TankData.class), any());
    }

    @Test
    void aCalculatedVolumeBelowOneTenthOfALitreIsRejected() {
        assertThatThrownBy(() -> service.create(USER, sized(null, "1", "1", "1")))
                .isInstanceOfSatisfying(ValidationException.class, e ->
                        assertThat(e.getFieldErrors()).containsOnlyKeys("volumeLiters"));
    }

    @Test
    void theLargestAllowedVolumeIsAccepted() {
        // 100 x 100 x 100 cm = 1000 L, 1000 x 100 x 100 cm = 10 000 L
        TankData data = storedByCreate(sized(null, "1000", "100", "100"));

        assertThat(data.getVolumeLiters()).isEqualByComparingTo("10000.0");
    }

    @Test
    void updateWithoutDimensionsSendsEmptyDimensionsSoTheyAreCleared() {
        when(tanks.update(eq(TANK), eq(USER), any(TankData.class), any())).thenReturn(true);

        service.update(USER, TANK, sized("70", null, null, null));

        ArgumentCaptor<TankData> data = ArgumentCaptor.forClass(TankData.class);
        verify(tanks).update(eq(TANK), eq(USER), data.capture(), eq(NOW));
        assertThat(data.getValue().getLengthCm()).isNull();
        assertThat(data.getValue().getVolumeLiters()).isEqualByComparingTo("70");
    }

    @Test
    void createStoresFishInReverseSoTheFirstRowIsReadBackFirst() {
        service.create(USER, request("Be",
                new FishRequest("Moi nhat", 1, FishStatus.ALIVE),
                new FishRequest("Giua", 2, FishStatus.ALIVE),
                new FishRequest("Cu nhat", 3, FishStatus.DEAD)));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TankFishData>> stored = ArgumentCaptor.forClass(List.class);
        verify(fish).insertAll(eq(TANK), stored.capture(), eq(NOW));
        assertThat(stored.getValue()).extracting(TankFishData::getSpeciesName)
                .containsExactly("Cu nhat", "Giua", "Moi nhat");
    }

    @Test
    void createWithoutFishInsertsNone() {
        service.create(USER, new TankRequest("Be", null, null, null, null, null, null, null));

        verify(fish, never()).insertAll(anyLong(), anyList(), any());
    }

    @Test
    void duplicateNamesAreAllowed() {
        service.create(USER, request("Be 1"));
        service.create(USER, request("Be 1"));

        verify(tanks, org.mockito.Mockito.times(2)).insert(eq(USER), any(TankData.class), any());
    }

    @Test
    void updateReplacesFishAfterUpdatingTheTank() {
        when(tanks.update(eq(TANK), eq(USER), any(TankData.class), any())).thenReturn(true);

        service.update(USER, TANK, request("Be sua", new FishRequest("Neon", 5, FishStatus.ALIVE)));

        InOrder order = inOrder(tanks, fish);
        order.verify(tanks).update(eq(TANK), eq(USER), any(TankData.class), eq(NOW));
        order.verify(fish).deleteAllByTankId(TANK);
        order.verify(fish).insertAll(eq(TANK), anyList(), eq(NOW));
    }

    @Test
    void updateOfAnotherUsersTankIsNotFoundAndChangesNothing() {
        when(tanks.update(eq(TANK), eq(OTHER_USER), any(TankData.class), any())).thenReturn(false);

        assertThatThrownBy(() -> service.update(OTHER_USER, TANK, request("Hack", new FishRequest("X", 1, FishStatus.ALIVE))))
                .isInstanceOf(NotFoundException.class);
        verify(fish, never()).deleteAllByTankId(anyLong());
        verify(fish, never()).insertAll(anyLong(), anyList(), any());
    }

    @Test
    void getOfAnotherUsersTankIsNotFound() {
        assertThatThrownBy(() -> service.get(OTHER_USER, TANK)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteOfAnotherUsersTankIsNotFound() {
        when(tanks.deleteByIdAndUserId(TANK, OTHER_USER)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(OTHER_USER, TANK)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteOfOwnTankSucceeds() {
        when(tanks.deleteByIdAndUserId(TANK, USER)).thenReturn(true);

        service.delete(USER, TANK);

        verify(tanks).deleteByIdAndUserId(TANK, USER);
    }
}
