package com.fishcaring.service;

import com.fishcaring.dto.TaskRequest;
import com.fishcaring.dto.TaskResponse;
import com.fishcaring.entity.CareTaskEntity;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.CareResult;
import com.fishcaring.exception.ConflictException;
import com.fishcaring.exception.NotFoundException;
import com.fishcaring.exception.ValidationException;
import com.fishcaring.mapper.TaskMapper;
import com.fishcaring.object.CareTaskData;
import com.fishcaring.repository.CareLogRepository;
import com.fishcaring.repository.CareTaskRepository;
import com.fishcaring.repository.NotificationRepository;
import com.fishcaring.repository.TankRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Care task management. Every method is scoped to the given user; other users' data is 404. A task
 * belongs to one of the user's tanks or to no tank at all (a "general" task).
 */
@Service
public class CareTaskService {

    static final int MIN_INTERVAL_DAYS = 2;
    static final int MAX_INTERVAL_DAYS = 60;
    private static final String TANK_NOT_FOUND = "Tank not found";
    private static final String TASK_NOT_FOUND = "Task not found";

    private final TankRepository tanks;
    private final CareTaskRepository tasks;
    private final CareLogRepository logs;
    private final NotificationRepository notifications;
    private final TaskMapper mapper;
    private final Clock clock;

    public CareTaskService(TankRepository tanks, CareTaskRepository tasks, CareLogRepository logs,
                           NotificationRepository notifications, TaskMapper mapper, Clock clock) {
        this.tanks = tanks;
        this.tasks = tasks;
        this.logs = logs;
        this.notifications = notifications;
        this.mapper = mapper;
        this.clock = clock;
    }

    public TaskResponse get(long userId, long taskId) {
        return mapper.toResponse(load(userId, taskId));
    }

    /** The user's tasks that belong to no tank. */
    public List<TaskResponse> listGeneral(long userId) {
        return tasks.findAllGeneralByUserId(userId).stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public TaskResponse create(long userId, TaskRequest request) {
        requireOwnTank(userId, request.getTankId());
        LocalDateTime now = LocalDateTime.now(clock);
        validateSchedule(request, true, now);
        LocalDateTime due = firstDue(request, now);
        long id = tasks.insert(userId, mapper.toData(request, true, due), now);
        return mapper.toResponse(load(userId, id));
    }

    @Transactional
    public TaskResponse update(long userId, long taskId, TaskRequest request) {
        CareTaskEntity existing = load(userId, taskId);
        requireOwnTank(userId, request.getTankId());
        LocalDateTime now = LocalDateTime.now(clock);
        CareTaskData probe = mapper.toData(request, existing.getEnabled(), null);
        boolean timingChanged = timingChanged(existing, probe);
        validateSchedule(request, timingChanged, now);

        // Moving the task to another tank (or to none) is not a timing change.
        LocalDateTime due = existing.getNextDueAt();
        if (!existing.getEnabled()) {
            due = null;
        } else if (timingChanged) {
            due = firstDue(request, now);
        }
        tasks.update(taskId, userId, mapper.toData(request, existing.getEnabled(), due), now);
        if (timingChanged) {
            // the old notification is about the old due time and would block the one for the new time
            notifications.resolveOpenByTaskId(taskId, now);
        }
        return mapper.toResponse(load(userId, taskId));
    }

    @Transactional
    public TaskResponse setEnabled(long userId, long taskId, boolean enabled) {
        CareTaskEntity existing = load(userId, taskId);
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime due = null;
        if (enabled) {
            if (existing.getRepeatType() == RepeatType.ONCE
                    && !existing.getStartDate().atTime(existing.getTimeOfDay()).isAfter(now)) {
                throw new ValidationException(Map.of("startDate", "must be in the future"));
            }
            due = ScheduleCalculator.firstDue(existing.getRepeatType(), existing.getTimeOfDay(),
                    existing.getIntervalDays(), existing.getStartDate(), now);
        }
        tasks.setEnabled(taskId, userId, enabled, due, now);
        notifications.resolveOpenByTaskId(taskId, now);
        return mapper.toResponse(load(userId, taskId));
    }

    /**
     * Marks the task as done: logs it, then moves {@code nextDueAt} on (a one-off task is turned off).
     * Only an enabled task can be completed.
     */
    @Transactional
    public TaskResponse complete(long userId, long taskId) {
        CareTaskEntity task = loadEnabled(userId, taskId);
        LocalDateTime now = LocalDateTime.now(clock);
        Optional<LocalDateTime> next = ScheduleCalculator.nextAfterComplete(task.getRepeatType(),
                task.getTimeOfDay(), task.getIntervalDays(), task.getNextDueAt(), now);
        logs.insert(userId, task.getTankId(), taskId, task.getTitle(), CareResult.DONE, task.getNextDueAt(), now);
        tasks.setEnabled(taskId, userId, next.isPresent(), next.orElse(null), now);
        notifications.resolveOpenByTaskId(taskId, now);
        return mapper.toResponse(load(userId, taskId));
    }

    /** Postpones the task by one day (keeping the time of day) and logs it. Only an enabled task can be snoozed. */
    @Transactional
    public TaskResponse snooze(long userId, long taskId) {
        CareTaskEntity task = loadEnabled(userId, taskId);
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime next = ScheduleCalculator.snooze(task.getNextDueAt(), task.getTimeOfDay(), now);
        logs.insert(userId, task.getTankId(), taskId, task.getTitle(), CareResult.SNOOZED, task.getNextDueAt(), now);
        tasks.setEnabled(taskId, userId, true, next, now);
        notifications.resolveOpenByTaskId(taskId, now);
        return mapper.toResponse(load(userId, taskId));
    }

    @Transactional
    public void delete(long userId, long taskId) {
        if (!tasks.deleteByIdAndUserId(taskId, userId)) {
            throw new NotFoundException(TASK_NOT_FOUND);
        }
    }

    private CareTaskEntity load(long userId, long taskId) {
        return tasks.findByIdAndUserId(taskId, userId).orElseThrow(() -> new NotFoundException(TASK_NOT_FOUND));
    }

    private CareTaskEntity loadEnabled(long userId, long taskId) {
        CareTaskEntity task = load(userId, taskId);
        if (!task.getEnabled() || task.getNextDueAt() == null) {
            throw new ConflictException("Task is turned off");
        }
        return task;
    }

    /** A given tank must belong to the user; no tank (null) is fine. */
    private void requireOwnTank(long userId, Long tankId) {
        if (tankId != null && tanks.findByIdAndUserId(tankId, userId).isEmpty()) {
            throw new NotFoundException(TANK_NOT_FOUND);
        }
    }

    private LocalDateTime firstDue(TaskRequest request, LocalDateTime now) {
        return ScheduleCalculator.firstDue(request.getRepeatType(), request.getTimeOfDay(),
                request.getIntervalDays(), request.getStartDate(), now);
    }

    /** Cross-field rules. A one-off date in the past is only an error when the timing is being set. */
    private void validateSchedule(TaskRequest request, boolean checkFuture, LocalDateTime now) {
        Map<String, String> errors = new LinkedHashMap<>();
        switch (request.getRepeatType()) {
            case EVERY_N_DAYS -> {
                Integer days = request.getIntervalDays();
                if (days == null || days < MIN_INTERVAL_DAYS || days > MAX_INTERVAL_DAYS) {
                    errors.put("intervalDays", "must be between 2 and 60");
                }
                if (request.getStartDate() == null) {
                    errors.put("startDate", "is required");
                }
            }
            case ONCE -> {
                if (request.getStartDate() == null) {
                    errors.put("startDate", "is required");
                } else if (checkFuture && !request.getStartDate().atTime(request.getTimeOfDay()).isAfter(now)) {
                    errors.put("startDate", "must be in the future");
                }
            }
            case DAILY -> {
            }
        }
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }

    private static boolean timingChanged(CareTaskEntity existing, CareTaskData next) {
        return existing.getRepeatType() != next.getRepeatType()
                || !Objects.equals(existing.getIntervalDays(), next.getIntervalDays())
                || !Objects.equals(existing.getTimeOfDay(), next.getTimeOfDay())
                || !Objects.equals(existing.getStartDate(), next.getStartDate());
    }
}
