package com.fishcaring.service;

import com.fishcaring.dto.TodayItemResponse;
import com.fishcaring.dto.TodayResponse;
import com.fishcaring.entity.TodayItemEntity;
import com.fishcaring.mapper.CareLogMapper;
import com.fishcaring.repository.CareTaskRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/** The "today" screen: tasks due now or overdue, and the ones still to come before midnight. */
@Service
public class TodayService {

    private final CareTaskRepository tasks;
    private final CareLogMapper mapper;
    private final Clock clock;

    public TodayService(CareTaskRepository tasks, CareLogMapper mapper, Clock clock) {
        this.tasks = tasks;
        this.mapper = mapper;
        this.clock = clock;
    }

    public TodayResponse today(long userId) {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime endOfToday = now.toLocalDate().plusDays(1).atStartOfDay();

        List<TodayItemResponse> due = new ArrayList<>();
        List<TodayItemResponse> upcoming = new ArrayList<>();
        for (TodayItemEntity item : tasks.findActiveUntilByUserId(userId, endOfToday)) {
            (item.getNextDueAt().isAfter(now) ? upcoming : due).add(mapper.toTodayItem(item));
        }
        return new TodayResponse(due, upcoming);
    }
}
