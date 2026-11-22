package com.fishcaring.mapper;

import com.fishcaring.dto.TaskRequest;
import com.fishcaring.dto.TaskResponse;
import com.fishcaring.entity.CareTaskEntity;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import com.fishcaring.object.CareTaskData;
import java.time.LocalDateTime;
import org.springframework.stereotype.Component;

@Component
public class TaskMapper {

    /**
     * Builds the data to store. Only the detail field of the chosen type is kept, and {@code DAILY}
     * keeps no interval or start date. {@code nextDueAt} and {@code enabled} are decided by the service.
     */
    public CareTaskData toData(TaskRequest request, boolean enabled, LocalDateTime nextDueAt) {
        TaskType type = request.getType();
        RepeatType repeat = request.getRepeatType();
        boolean everyN = repeat == RepeatType.EVERY_N_DAYS;
        return CareTaskData.builder()
                .tankId(request.getTankId())
                .type(type)
                .title(request.getTitle().trim())
                .note(blankToNull(request.getNote()))
                .repeatType(repeat)
                .intervalDays(everyN ? request.getIntervalDays() : null)
                .timeOfDay(request.getTimeOfDay())
                .startDate(repeat == RepeatType.DAILY ? null : request.getStartDate())
                .foodName(type == TaskType.FEED ? blankToNull(request.getFoodName()) : null)
                .waterChangePercent(type == TaskType.WATER_CHANGE ? request.getWaterChangePercent() : null)
                .fertilizerMl(type == TaskType.FERTILIZE ? request.getFertilizerMl() : null)
                .enabled(enabled)
                .nextDueAt(nextDueAt)
                .build();
    }

    public TaskResponse toResponse(CareTaskEntity task) {
        return TaskResponse.builder()
                .id(task.getId())
                .tankId(task.getTankId())
                .type(task.getType())
                .title(task.getTitle())
                .note(task.getNote())
                .repeatType(task.getRepeatType())
                .intervalDays(task.getIntervalDays())
                .timeOfDay(task.getTimeOfDay())
                .startDate(task.getStartDate())
                .foodName(task.getFoodName())
                .waterChangePercent(task.getWaterChangePercent())
                .fertilizerMl(task.getFertilizerMl())
                .enabled(task.getEnabled())
                .nextDueAt(task.getNextDueAt())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
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
