package com.fishcaring.service;

import com.fishcaring.enums.RepeatType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Pure schedule maths in Vietnam time. Every method takes {@code now} as a parameter and never reads
 * a clock, so tests use fixed times. Input validation (missing start date, a past one-off) is the
 * service's job.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ScheduleCalculator {

    /**
     * The first due time of a new or re-enabled schedule, always strictly after {@code now} except for
     * {@code ONCE}, which is exactly its start date and time.
     */
    public static LocalDateTime firstDue(RepeatType repeatType, LocalTime timeOfDay, Integer intervalDays,
                                         LocalDate startDate, LocalDateTime now) {
        return switch (repeatType) {
            case DAILY -> nextDailyAfter(timeOfDay, now);
            case EVERY_N_DAYS -> firstEveryNDays(timeOfDay, intervalDays, startDate, now);
            case ONCE -> startDate.atTime(timeOfDay);
        };
    }

    /**
     * The next due time after a task is completed: from the later of now and the old due time, the
     * next day (daily) or N days later (every N days) at the time of day. Empty for a one-off task.
     */
    public static Optional<LocalDateTime> nextAfterComplete(RepeatType repeatType, LocalTime timeOfDay,
                                                            Integer intervalDays, LocalDateTime nextDueAt,
                                                            LocalDateTime now) {
        LocalDateTime base = nextDueAt.isAfter(now) ? nextDueAt : now;
        return switch (repeatType) {
            case DAILY -> Optional.of(base.toLocalDate().plusDays(1).atTime(timeOfDay));
            case EVERY_N_DAYS -> Optional.of(base.toLocalDate().plusDays(intervalDays).atTime(timeOfDay));
            case ONCE -> Optional.empty();
        };
    }

    /** Snooze: one day later; if that is still not in the future, tomorrow at the time of day. */
    public static LocalDateTime snooze(LocalDateTime nextDueAt, LocalTime timeOfDay, LocalDateTime now) {
        LocalDateTime candidate = nextDueAt.plusDays(1);
        if (candidate.isAfter(now)) {
            return candidate;
        }
        return now.toLocalDate().plusDays(1).atTime(timeOfDay);
    }

    private static LocalDateTime nextDailyAfter(LocalTime timeOfDay, LocalDateTime now) {
        LocalDateTime today = now.toLocalDate().atTime(timeOfDay);
        return today.isAfter(now) ? today : today.plusDays(1);
    }

    private static LocalDateTime firstEveryNDays(LocalTime timeOfDay, int intervalDays, LocalDate startDate,
                                                 LocalDateTime now) {
        LocalDateTime candidate = startDate.atTime(timeOfDay);
        if (candidate.isAfter(now)) {
            return candidate;
        }
        long elapsed = ChronoUnit.DAYS.between(startDate, now.toLocalDate());
        candidate = startDate.plusDays(elapsed / intervalDays * intervalDays).atTime(timeOfDay);
        while (!candidate.isAfter(now)) {
            candidate = candidate.plusDays(intervalDays);
        }
        return candidate;
    }
}
