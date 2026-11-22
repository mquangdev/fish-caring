package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fishcaring.enums.RepeatType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ScheduleCalculatorTest {

    private static final LocalTime EIGHT = LocalTime.of(8, 0);

    private static LocalDateTime at(int y, int m, int d, int h, int min) {
        return LocalDateTime.of(y, m, d, h, min);
    }

    private static LocalDateTime daily(LocalDateTime now) {
        return ScheduleCalculator.firstDue(RepeatType.DAILY, EIGHT, null, null, now);
    }

    private static LocalDateTime everyN(int n, LocalDate start, LocalTime time, LocalDateTime now) {
        return ScheduleCalculator.firstDue(RepeatType.EVERY_N_DAYS, time, n, start, now);
    }

    // ---- first due: daily ----

    @Test
    void dailyBeforeTheTimeIsToday() {
        assertThat(daily(at(2026, 11, 21, 7, 0))).isEqualTo(at(2026, 11, 21, 8, 0));
    }

    @Test
    void dailyAfterTheTimeIsTomorrow() {
        assertThat(daily(at(2026, 11, 21, 9, 0))).isEqualTo(at(2026, 11, 22, 8, 0));
    }

    @Test
    void dailyExactlyAtTheTimeIsTomorrow() {
        assertThat(daily(at(2026, 11, 21, 8, 0))).isEqualTo(at(2026, 11, 22, 8, 0));
        assertThat(daily(at(2026, 11, 21, 8, 0).plusSeconds(1))).isEqualTo(at(2026, 11, 22, 8, 0));
        assertThat(daily(at(2026, 11, 21, 8, 0).minusSeconds(1))).isEqualTo(at(2026, 11, 21, 8, 0));
    }

    @Test
    void dailyCrossesMonthYearAndLeapDay() {
        assertThat(daily(at(2026, 11, 30, 9, 0))).isEqualTo(at(2026, 12, 1, 8, 0));
        assertThat(daily(at(2026, 12, 31, 9, 0))).isEqualTo(at(2027, 1, 1, 8, 0));
        assertThat(daily(at(2028, 2, 28, 9, 0))).isEqualTo(at(2028, 2, 29, 8, 0));
        assertThat(daily(at(2028, 2, 29, 9, 0))).isEqualTo(at(2028, 3, 1, 8, 0));
    }

    @Test
    void dailyAtMidnightAndLastMinute() {
        LocalTime midnight = LocalTime.MIDNIGHT;
        LocalTime late = LocalTime.of(23, 59);
        assertThat(ScheduleCalculator.firstDue(RepeatType.DAILY, midnight, null, null, at(2026, 11, 21, 0, 0)))
                .isEqualTo(at(2026, 11, 22, 0, 0));
        assertThat(ScheduleCalculator.firstDue(RepeatType.DAILY, midnight, null, null, at(2026, 11, 21, 23, 59)))
                .isEqualTo(at(2026, 11, 22, 0, 0));
        assertThat(ScheduleCalculator.firstDue(RepeatType.DAILY, late, null, null, at(2026, 11, 21, 23, 58)))
                .isEqualTo(at(2026, 11, 21, 23, 59));
    }

    // ---- first due: every N days ----

    @Test
    void everyNDaysWithAFutureStartDateIsTheStartDate() {
        assertThat(everyN(7, LocalDate.of(2026, 11, 25), EIGHT, at(2026, 11, 21, 12, 0)))
                .isEqualTo(at(2026, 11, 25, 8, 0));
    }

    @Test
    void everyNDaysStartingTodayBeforeTheTimeIsToday() {
        assertThat(everyN(7, LocalDate.of(2026, 11, 21), EIGHT, at(2026, 11, 21, 7, 0)))
                .isEqualTo(at(2026, 11, 21, 8, 0));
    }

    @Test
    void everyNDaysStartingTodayAfterTheTimeIsTheNextStep() {
        assertThat(everyN(7, LocalDate.of(2026, 11, 21), EIGHT, at(2026, 11, 21, 9, 0)))
                .isEqualTo(at(2026, 11, 28, 8, 0));
        assertThat(everyN(7, LocalDate.of(2026, 11, 21), EIGHT, at(2026, 11, 21, 8, 0)))
                .isEqualTo(at(2026, 11, 28, 8, 0));
    }

    @Test
    void everyNDaysWithAPastStartDateJumpsToTheNextStepAfterNow() {
        // steps: 1/11, 4/11, 7/11, ... every 3 days at 19:00; now is 21/11 10:00, so 22/11 (1 + 21)
        assertThat(everyN(3, LocalDate.of(2026, 11, 1), LocalTime.of(19, 0), at(2026, 11, 21, 10, 0)))
                .isEqualTo(at(2026, 11, 22, 19, 0));
        // 19/11 is a step (1 + 18) and 19:00 has not passed yet on that day
        assertThat(everyN(3, LocalDate.of(2026, 11, 1), LocalTime.of(19, 0), at(2026, 11, 19, 10, 0)))
                .isEqualTo(at(2026, 11, 19, 19, 0));
        assertThat(everyN(3, LocalDate.of(2026, 11, 1), LocalTime.of(19, 0), at(2026, 11, 19, 20, 0)))
                .isEqualTo(at(2026, 11, 22, 19, 0));
    }

    @Test
    void everyNDaysSupportsTheLimitsTwoAndSixty() {
        assertThat(everyN(2, LocalDate.of(2026, 11, 20), EIGHT, at(2026, 11, 21, 9, 0)))
                .isEqualTo(at(2026, 11, 22, 8, 0));
        assertThat(everyN(60, LocalDate.of(2026, 1, 1), EIGHT, at(2026, 11, 21, 9, 0)))
                .isEqualTo(at(2026, 12, 27, 8, 0)); // 1/1 + 6 x 60 days = day 361 of 2026
    }

    @Test
    void everyNDaysCrossesYearAndLeapDay() {
        assertThat(everyN(10, LocalDate.of(2026, 12, 25), EIGHT, at(2026, 12, 26, 9, 0)))
                .isEqualTo(at(2027, 1, 4, 8, 0));
        assertThat(everyN(2, LocalDate.of(2028, 2, 27), EIGHT, at(2028, 2, 27, 9, 0)))
                .isEqualTo(at(2028, 2, 29, 8, 0));
    }

    // ---- first due: once ----

    @Test
    void onceIsExactlyItsDateAndTime() {
        assertThat(ScheduleCalculator.firstDue(RepeatType.ONCE, LocalTime.of(21, 30), null,
                LocalDate.of(2026, 11, 25), at(2026, 11, 21, 8, 0))).isEqualTo(at(2026, 11, 25, 21, 30));
    }

    // ---- complete (test 2 to 5 of the spec) ----

    @Test
    void completingDailyOnTimeGivesTomorrowAtTheSameTime() {
        Optional<LocalDateTime> next = ScheduleCalculator.nextAfterComplete(RepeatType.DAILY, EIGHT, null,
                at(2026, 11, 21, 8, 0), at(2026, 11, 21, 8, 5));
        assertThat(next).contains(at(2026, 11, 22, 8, 0));
    }

    @Test
    void completingDailyThreeDaysLateGivesTomorrowNotACatchUp() {
        Optional<LocalDateTime> next = ScheduleCalculator.nextAfterComplete(RepeatType.DAILY, EIGHT, null,
                at(2026, 11, 18, 8, 0), at(2026, 11, 21, 10, 0));
        assertThat(next).contains(at(2026, 11, 22, 8, 0));
    }

    @Test
    void completingDailyEarlyDoesNotRemindAgainTheSameDay() {
        Optional<LocalDateTime> next = ScheduleCalculator.nextAfterComplete(RepeatType.DAILY, EIGHT, null,
                at(2026, 11, 21, 8, 0), at(2026, 11, 21, 6, 0));
        assertThat(next).contains(at(2026, 11, 22, 8, 0));
        // completed two days early: counts from the planned day
        assertThat(ScheduleCalculator.nextAfterComplete(RepeatType.DAILY, EIGHT, null,
                at(2026, 11, 23, 8, 0), at(2026, 11, 21, 6, 0))).contains(at(2026, 11, 24, 8, 0));
    }

    @Test
    void completingEveryNDaysCountsNDaysFromTheCompletionDay() {
        LocalTime evening = LocalTime.of(19, 0);
        assertThat(ScheduleCalculator.nextAfterComplete(RepeatType.EVERY_N_DAYS, evening, 7,
                at(2026, 11, 21, 19, 0), at(2026, 11, 21, 19, 30))).contains(at(2026, 11, 28, 19, 0));
        // 10 days late
        assertThat(ScheduleCalculator.nextAfterComplete(RepeatType.EVERY_N_DAYS, evening, 7,
                at(2026, 11, 11, 19, 0), at(2026, 11, 21, 9, 0))).contains(at(2026, 11, 28, 19, 0));
    }

    @Test
    void completingOnceHasNoNextDueTime() {
        assertThat(ScheduleCalculator.nextAfterComplete(RepeatType.ONCE, EIGHT, null,
                at(2026, 11, 21, 8, 0), at(2026, 11, 21, 9, 0))).isEmpty();
    }

    // ---- snooze (test 6 and 7 of the spec) ----

    @Test
    void snoozeMovesTheDueTimeOneDayLaterKeepingTheTime() {
        assertThat(ScheduleCalculator.snooze(at(2026, 11, 21, 8, 0), EIGHT, at(2026, 11, 21, 8, 5)))
                .isEqualTo(at(2026, 11, 22, 8, 0));
    }

    @Test
    void snoozeWhenManyDaysOverdueStillEndsInTheFuture() {
        LocalDateTime now = at(2026, 11, 21, 10, 0);
        LocalDateTime next = ScheduleCalculator.snooze(at(2026, 11, 15, 8, 0), EIGHT, now);
        assertThat(next).isEqualTo(at(2026, 11, 22, 8, 0)).isAfter(now);
    }

    @Test
    void snoozeKeepsTheTimeOfDayAcrossMonthEnd() {
        assertThat(ScheduleCalculator.snooze(at(2026, 11, 30, 19, 0), LocalTime.of(19, 0), at(2026, 11, 30, 19, 1)))
                .isEqualTo(at(2026, 12, 1, 19, 0));
    }
}
