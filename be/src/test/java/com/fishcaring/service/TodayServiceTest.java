package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.fishcaring.dto.TodayResponse;
import com.fishcaring.entity.TodayItemEntity;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import com.fishcaring.mapper.CareLogMapper;
import com.fishcaring.repository.CareTaskRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TodayServiceTest {

    // 2026-11-21 08:00 (the clock zone is UTC, so the local date time is the same)
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-21T08:00:00Z"), ZoneOffset.UTC);
    private static final LocalDateTime END_OF_TODAY = LocalDateTime.of(2026, 11, 22, 0, 0);
    private static final long USER = 1L;

    @Mock
    private CareTaskRepository tasks;

    private static TodayItemEntity item(long id, String tankName, LocalDateTime due) {
        return new TodayItemEntity(id, tankName == null ? null : 7L, tankName, TaskType.FEED, "Viec " + id, null,
                RepeatType.DAILY, LocalTime.of(8, 0), null, null, null, due);
    }

    @Test
    void splitsDueFromUpcomingAtNowAndAsksForTasksUntilMidnight() {
        when(tasks.findActiveUntilByUserId(USER, END_OF_TODAY)).thenReturn(List.of(
                item(1, "Be 1", LocalDateTime.of(2026, 11, 19, 8, 0)),   // overdue
                item(2, "Be 1", LocalDateTime.of(2026, 11, 21, 8, 0)),   // exactly now: due
                item(3, null, LocalDateTime.of(2026, 11, 21, 8, 0, 1)),  // one second later: upcoming
                item(4, "Be 2", LocalDateTime.of(2026, 11, 21, 23, 59))));

        TodayResponse today = new TodayService(tasks, new CareLogMapper(), CLOCK).today(USER);

        assertThat(today.getDue()).extracting(i -> i.getId()).containsExactly(1L, 2L);
        assertThat(today.getUpcoming()).extracting(i -> i.getId()).containsExactly(3L, 4L);
    }

    @Test
    void aTaskWithoutATankHasNoTankName() {
        when(tasks.findActiveUntilByUserId(USER, END_OF_TODAY)).thenReturn(List.of(
                item(3, null, LocalDateTime.of(2026, 11, 21, 7, 0))));

        TodayResponse today = new TodayService(tasks, new CareLogMapper(), CLOCK).today(USER);

        assertThat(today.getDue().get(0).getTankName()).isNull();
        assertThat(today.getDue().get(0).getTankId()).isNull();
    }

    @Test
    void nothingToDoGivesEmptyGroups() {
        when(tasks.findActiveUntilByUserId(USER, END_OF_TODAY)).thenReturn(List.of());

        TodayResponse today = new TodayService(tasks, new CareLogMapper(), CLOCK).today(USER);

        assertThat(today.getDue()).isEmpty();
        assertThat(today.getUpcoming()).isEmpty();
    }
}
