package com.fishcaring.mapper;

import com.fishcaring.dto.CareLogResponse;
import com.fishcaring.dto.TodayItemResponse;
import com.fishcaring.entity.CareLogEntity;
import com.fishcaring.entity.TodayItemEntity;
import org.springframework.stereotype.Component;

/** Converts care logs and "today" rows to their API shapes. */
@Component
public class CareLogMapper {

    public CareLogResponse toResponse(CareLogEntity log) {
        return CareLogResponse.builder()
                .id(log.getId())
                .tankId(log.getTankId())
                .taskId(log.getTaskId())
                .taskTitle(log.getTaskTitle())
                .result(log.getResult())
                .dueAt(log.getDueAt())
                .actedAt(log.getActedAt())
                .build();
    }

    public TodayItemResponse toTodayItem(TodayItemEntity item) {
        return TodayItemResponse.builder()
                .id(item.getId())
                .tankId(item.getTankId())
                .tankName(item.getTankName())
                .type(item.getType())
                .title(item.getTitle())
                .note(item.getNote())
                .repeatType(item.getRepeatType())
                .timeOfDay(item.getTimeOfDay())
                .foodName(item.getFoodName())
                .waterChangePercent(item.getWaterChangePercent())
                .fertilizerMl(item.getFertilizerMl())
                .nextDueAt(item.getNextDueAt())
                .build();
    }
}
