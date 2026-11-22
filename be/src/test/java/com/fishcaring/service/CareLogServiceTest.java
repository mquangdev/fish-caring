package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fishcaring.entity.CareLogEntity;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.enums.CareResult;
import com.fishcaring.exception.NotFoundException;
import com.fishcaring.mapper.CareLogMapper;
import com.fishcaring.repository.CareLogRepository;
import com.fishcaring.repository.TankRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CareLogServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 21, 8, 0);
    private static final long USER = 1L;
    private static final long OTHER_USER = 2L;
    private static final long TANK = 10L;

    @Mock
    private TankRepository tanks;
    @Mock
    private CareLogRepository logs;

    private CareLogService service;

    @BeforeEach
    void setUp() {
        service = new CareLogService(tanks, logs, new CareLogMapper());
        TankEntity tank = new TankEntity(TANK, USER, "Be", new BigDecimal("60.0"), null, null, null, null, null, NOW, NOW);
        when(tanks.findByIdAndUserId(TANK, USER)).thenReturn(Optional.of(tank));
        when(tanks.findByIdAndUserId(TANK, OTHER_USER)).thenReturn(Optional.empty());
    }

    @Test
    void limitDefaultsToFiftyAndIsKeptBetweenOneAndOneHundred() {
        assertThat(CareLogService.clamp(null)).isEqualTo(50);
        assertThat(CareLogService.clamp(0)).isEqualTo(1);
        assertThat(CareLogService.clamp(-5)).isEqualTo(1);
        assertThat(CareLogService.clamp(20)).isEqualTo(20);
        assertThat(CareLogService.clamp(500)).isEqualTo(100);
    }

    @Test
    void tankLogsUseTheClampedLimitAndMapTheLogs() {
        when(logs.findRecentByTankId(TANK, USER, 100)).thenReturn(List.of(
                new CareLogEntity(1L, USER, TANK, 5L, "Cho an", CareResult.DONE, NOW, NOW, NOW, NOW)));

        var result = service.tankLogs(USER, TANK, 500);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTaskTitle()).isEqualTo("Cho an");
        assertThat(result.get(0).getResult()).isEqualTo(CareResult.DONE);
    }

    @Test
    void tankLogsOfSomeoneElsesTankAreNotFound() {
        assertThatThrownBy(() -> service.tankLogs(OTHER_USER, TANK, 50)).isInstanceOf(NotFoundException.class);
        verify(logs, never()).findRecentByTankId(anyLong(), anyLong(), anyInt());
    }

    @Test
    void generalLogsAreReadForTheUserOnly() {
        when(logs.findRecentGeneralByUserId(USER, 50)).thenReturn(List.of(
                new CareLogEntity(2L, USER, null, 6L, "Thay nuoc trun chi", CareResult.SNOOZED, NOW, NOW, NOW, NOW)));
        when(logs.findRecentGeneralByUserId(OTHER_USER, 50)).thenReturn(List.of());

        var result = service.generalLogs(USER, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTankId()).isNull();
        assertThat(service.generalLogs(OTHER_USER, null)).isEmpty();
    }
}
