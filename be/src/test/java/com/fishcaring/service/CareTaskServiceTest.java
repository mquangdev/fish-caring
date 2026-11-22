package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fishcaring.dto.TaskRequest;
import com.fishcaring.dto.TaskResponse;
import com.fishcaring.entity.CareTaskEntity;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import com.fishcaring.exception.NotFoundException;
import com.fishcaring.exception.ValidationException;
import com.fishcaring.mapper.TaskMapper;
import com.fishcaring.object.CareTaskData;
import com.fishcaring.enums.CareResult;
import com.fishcaring.exception.ConflictException;
import com.fishcaring.repository.CareLogRepository;
import com.fishcaring.repository.CareTaskRepository;
import com.fishcaring.repository.NotificationRepository;
import com.fishcaring.repository.TankRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CareTaskServiceTest {

    // 2026-11-21 08:00 (the clock zone is UTC, so the local date time is the same)
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-21T08:00:00Z"), ZoneOffset.UTC);
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 21, 8, 0);
    private static final long USER = 1L;
    private static final long OTHER_USER = 2L;
    private static final long TANK = 10L;
    private static final long TASK = 20L;

    @Mock
    private TankRepository tanks;
    @Mock
    private CareTaskRepository tasks;
    @Mock
    private CareLogRepository logs;
    @Mock
    private NotificationRepository notifications;

    private CareTaskService service;

    @BeforeEach
    void setUp() {
        service = new CareTaskService(tanks, tasks, logs, notifications, new TaskMapper(), CLOCK);
        TankEntity tank = new TankEntity(TANK, USER, "Be", new BigDecimal("60.0"), null, null, null, null, null, NOW, NOW);
        when(tanks.findByIdAndUserId(TANK, USER)).thenReturn(Optional.of(tank));
        when(tanks.findByIdAndUserId(TANK, OTHER_USER)).thenReturn(Optional.empty());
        when(tasks.insert(eq(USER), any(CareTaskData.class), any())).thenReturn(TASK);
        when(tasks.findByIdAndUserId(TASK, OTHER_USER)).thenReturn(Optional.empty());
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, LocalDateTime.of(2026, 11, 22, 8, 0)));
    }

    // ---- helpers ----

    private void stored(CareTaskEntity entity) {
        when(tasks.findByIdAndUserId(TASK, USER)).thenReturn(Optional.of(entity));
    }

    private static CareTaskEntity entity(RepeatType repeat, Integer interval, LocalTime time, LocalDate start,
                                         boolean enabled, LocalDateTime due) {
        return new CareTaskEntity(TASK, USER, TANK, TaskType.FEED, "Cho an", null, repeat, interval, time, start,
                null, null, null, enabled, due, NOW, NOW);
    }

    private static TaskRequest request(RepeatType repeat, Integer interval, LocalTime time, LocalDate start) {
        return new TaskRequest(TANK, TaskType.FEED, "Cho an", null, repeat, interval, time, start, null, null, null);
    }

    private CareTaskData saved() {
        ArgumentCaptor<CareTaskData> captor = ArgumentCaptor.forClass(CareTaskData.class);
        verify(tasks).insert(eq(USER), captor.capture(), any());
        return captor.getValue();
    }

    private CareTaskData updated() {
        ArgumentCaptor<CareTaskData> captor = ArgumentCaptor.forClass(CareTaskData.class);
        verify(tasks).update(eq(TASK), eq(USER), captor.capture(), any());
        return captor.getValue();
    }

    private static void assertFieldError(Runnable action, String field) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ValidationException.class,
                e -> assertThat(e.getFieldErrors()).containsKey(field));
    }

    // ---- create ----

    @Test
    void createDailyComputesTheFirstDueTimeAndDropsIntervalAndStartDate() {
        service.create(USER, request(RepeatType.DAILY, 5, LocalTime.of(9, 0), LocalDate.of(2026, 11, 1)));

        CareTaskData data = saved();
        assertThat(data.getNextDueAt()).isEqualTo(LocalDateTime.of(2026, 11, 21, 9, 0));
        assertThat(data.getIntervalDays()).isNull();
        assertThat(data.getStartDate()).isNull();
        assertThat(data.getEnabled()).isTrue();
    }

    @Test
    void createDailyAfterTheTimeStartsTomorrow() {
        service.create(USER, request(RepeatType.DAILY, null, LocalTime.of(8, 0), null));

        assertThat(saved().getNextDueAt()).isEqualTo(LocalDateTime.of(2026, 11, 22, 8, 0));
    }

    @Test
    void createEveryNDaysUsesTheStepsFromTheStartDate() {
        service.create(USER, request(RepeatType.EVERY_N_DAYS, 7, LocalTime.of(19, 0), LocalDate.of(2026, 11, 14)));

        CareTaskData data = saved();
        assertThat(data.getNextDueAt()).isEqualTo(LocalDateTime.of(2026, 11, 21, 19, 0));
        assertThat(data.getIntervalDays()).isEqualTo(7);
    }

    @Test
    void createOnceInTheFutureUsesItsDateAndTime() {
        service.create(USER, request(RepeatType.ONCE, null, LocalTime.of(21, 0), LocalDate.of(2026, 11, 25)));

        assertThat(saved().getNextDueAt()).isEqualTo(LocalDateTime.of(2026, 11, 25, 21, 0));
    }

    @Test
    void createOnceInThePastOrNowIsRejected() {
        assertFieldError(() -> service.create(USER,
                request(RepeatType.ONCE, null, LocalTime.of(7, 0), LocalDate.of(2026, 11, 21))), "startDate");
        assertFieldError(() -> service.create(USER,
                request(RepeatType.ONCE, null, LocalTime.of(8, 0), LocalDate.of(2026, 11, 21))), "startDate");
        assertFieldError(() -> service.create(USER,
                request(RepeatType.ONCE, null, LocalTime.of(8, 0), LocalDate.of(2026, 11, 1))), "startDate");
        verify(tasks, never()).insert(anyLong(), any(), any());
    }

    @Test
    void createEveryNDaysNeedsAnIntervalFromTwoToSixtyAndAStartDate() {
        LocalDate start = LocalDate.of(2026, 11, 21);
        assertFieldError(() -> service.create(USER,
                request(RepeatType.EVERY_N_DAYS, null, LocalTime.of(8, 0), start)), "intervalDays");
        assertFieldError(() -> service.create(USER,
                request(RepeatType.EVERY_N_DAYS, 1, LocalTime.of(8, 0), start)), "intervalDays");
        assertFieldError(() -> service.create(USER,
                request(RepeatType.EVERY_N_DAYS, 61, LocalTime.of(8, 0), start)), "intervalDays");
        assertFieldError(() -> service.create(USER,
                request(RepeatType.EVERY_N_DAYS, 7, LocalTime.of(8, 0), null)), "startDate");
        verify(tasks, never()).insert(anyLong(), any(), any());
    }

    @Test
    void createOnceWithoutADateIsRejected() {
        assertFieldError(() -> service.create(USER,
                request(RepeatType.ONCE, null, LocalTime.of(8, 0), null)), "startDate");
    }

    @Test
    void createKeepsOnlyTheDetailOfTheChosenType() {
        TaskRequest water = new TaskRequest(TANK, TaskType.WATER_CHANGE, " Thay nuoc ", "  ", RepeatType.DAILY, null,
                LocalTime.of(9, 0), null, "Hat", 30, new BigDecimal("5.5"));
        service.create(USER, water);

        CareTaskData data = saved();
        assertThat(data.getTitle()).isEqualTo("Thay nuoc");
        assertThat(data.getNote()).isNull();
        assertThat(data.getWaterChangePercent()).isEqualTo(30);
        assertThat(data.getFoodName()).isNull();
        assertThat(data.getFertilizerMl()).isNull();
    }

    @Test
    void createFeedAndFertilizeKeepTheirOwnDetail() {
        service.create(USER, new TaskRequest(TANK, TaskType.FEED, "Cho an", null, RepeatType.DAILY, null,
                LocalTime.of(9, 0), null, " Hat 1mm ", 30, new BigDecimal("5.5")));
        CareTaskData feed = saved();
        assertThat(feed.getFoodName()).isEqualTo("Hat 1mm");
        assertThat(feed.getWaterChangePercent()).isNull();
        assertThat(feed.getFertilizerMl()).isNull();
    }

    @Test
    void createInSomeoneElsesTankIsNotFoundAndWritesNothing() {
        assertThatThrownBy(() -> service.create(OTHER_USER, request(RepeatType.DAILY, null, LocalTime.of(9, 0), null)))
                .isInstanceOf(NotFoundException.class);
        verify(tasks, never()).insert(anyLong(), any(), any());
    }

    // ---- update ----

    @Test
    void editingTextOnlyKeepsTheDueTimeEvenWhenSnoozed() {
        LocalDateTime snoozed = LocalDateTime.of(2026, 11, 23, 8, 0);
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, snoozed));
        TaskRequest edit = new TaskRequest(TANK, TaskType.WATER_CHANGE, "Thay nuoc", "ghi chu", RepeatType.DAILY, null,
                LocalTime.of(8, 0), null, null, 25, null);

        service.update(USER, TASK, edit);

        CareTaskData data = updated();
        assertThat(data.getNextDueAt()).isEqualTo(snoozed);
        assertThat(data.getType()).isEqualTo(TaskType.WATER_CHANGE);
        assertThat(data.getWaterChangePercent()).isEqualTo(25);
    }

    @Test
    void changingTheTimeRecomputesTheDueTime() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, LocalDateTime.of(2026, 11, 23, 8, 0)));

        service.update(USER, TASK, request(RepeatType.DAILY, null, LocalTime.of(18, 0), null));

        assertThat(updated().getNextDueAt()).isEqualTo(LocalDateTime.of(2026, 11, 21, 18, 0));
    }

    @Test
    void changingTheRepeatTypeRecomputesTheDueTime() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, LocalDateTime.of(2026, 11, 22, 8, 0)));

        service.update(USER, TASK, request(RepeatType.EVERY_N_DAYS, 3, LocalTime.of(8, 0), LocalDate.of(2026, 11, 22)));

        assertThat(updated().getNextDueAt()).isEqualTo(LocalDateTime.of(2026, 11, 22, 8, 0));
    }

    @Test
    void editingADisabledTaskKeepsItWithoutADueTime() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, false, null));

        service.update(USER, TASK, request(RepeatType.DAILY, null, LocalTime.of(18, 0), null));

        CareTaskData data = updated();
        assertThat(data.getEnabled()).isFalse();
        assertThat(data.getNextDueAt()).isNull();
    }

    @Test
    void editingTheTextOfAPastOnceTaskIsAllowedButMovingItToThePastIsNot() {
        LocalDate past = LocalDate.of(2026, 11, 1);
        stored(entity(RepeatType.ONCE, null, LocalTime.of(8, 0), past, false, null));
        service.update(USER, TASK, request(RepeatType.ONCE, null, LocalTime.of(8, 0), past));
        assertThat(updated().getStartDate()).isEqualTo(past);

        assertFieldError(() -> service.update(USER, TASK,
                request(RepeatType.ONCE, null, LocalTime.of(9, 0), past)), "startDate");
    }

    @Test
    void updatingSomeoneElsesTaskIsNotFound() {
        assertThatThrownBy(() -> service.update(OTHER_USER, TASK, request(RepeatType.DAILY, null, LocalTime.of(9, 0), null)))
                .isInstanceOf(NotFoundException.class);
        verify(tasks, never()).update(anyLong(), anyLong(), any(), any());
    }

    // ---- enable and disable ----

    @Test
    void disablingClearsTheDueTime() {
        service.setEnabled(USER, TASK, false);

        verify(tasks).setEnabled(TASK, USER, false, null, NOW);
    }

    @Test
    void enablingAgainRecomputesTheDueTime() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(18, 0), null, false, null));

        service.setEnabled(USER, TASK, true);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 11, 21, 18, 0), NOW);
    }

    @Test
    void enablingAPastOnceTaskIsRejected() {
        stored(entity(RepeatType.ONCE, null, LocalTime.of(8, 0), LocalDate.of(2026, 11, 1), false, null));

        assertFieldError(() -> service.setEnabled(USER, TASK, true), "startDate");
        verify(tasks, never()).setEnabled(anyLong(), anyLong(), any(Boolean.class), any(), any());
    }

    @Test
    void enablingAFutureOnceTaskUsesItsDate() {
        stored(entity(RepeatType.ONCE, null, LocalTime.of(8, 0), LocalDate.of(2026, 12, 1), false, null));

        service.setEnabled(USER, TASK, true);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 12, 1, 8, 0), NOW);
    }

    @Test
    void togglingSomeoneElsesTaskIsNotFound() {
        assertThatThrownBy(() -> service.setEnabled(OTHER_USER, TASK, false)).isInstanceOf(NotFoundException.class);
        verify(tasks, never()).setEnabled(anyLong(), anyLong(), any(Boolean.class), any(), any());
    }

    // ---- delete ----

    @Test
    void deleteRemovesAnOwnTask() {
        when(tasks.deleteByIdAndUserId(TASK, USER)).thenReturn(true);

        service.delete(USER, TASK);

        verify(tasks).deleteByIdAndUserId(TASK, USER);
    }

    @Test
    void deletingSomeoneElsesTaskIsNotFound() {
        when(tasks.deleteByIdAndUserId(TASK, OTHER_USER)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(OTHER_USER, TASK)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void createReturnsTheStoredTask() {
        TaskResponse response = service.create(USER, request(RepeatType.DAILY, null, LocalTime.of(9, 0), null));

        assertThat(response.getId()).isEqualTo(TASK);
    }

    // ---- tasks without a tank ----

    private static TaskRequest generalRequest() {
        return new TaskRequest(null, TaskType.WATER_CHANGE, "Thay nuoc trun chi", null, RepeatType.DAILY, null,
                LocalTime.of(9, 0), null, null, 20, null);
    }

    @Test
    void createWithoutATankStoresAGeneralTaskWithoutLookingUpATank() {
        service.create(USER, generalRequest());

        CareTaskData data = saved();
        assertThat(data.getTankId()).isNull();
        assertThat(data.getNextDueAt()).isEqualTo(LocalDateTime.of(2026, 11, 21, 9, 0));
        verify(tanks, never()).findByIdAndUserId(anyLong(), anyLong());
    }

    @Test
    void movingATaskToAnotherTankKeepsTheDueTime() {
        LocalDateTime snoozed = LocalDateTime.of(2026, 11, 23, 8, 0);
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, snoozed));

        service.update(USER, TASK, request(RepeatType.DAILY, null, LocalTime.of(8, 0), null));

        CareTaskData data = updated();
        assertThat(data.getTankId()).isEqualTo(TANK);
        assertThat(data.getNextDueAt()).isEqualTo(snoozed);
    }

    @Test
    void movingATaskToNoTankKeepsTheDueTime() {
        LocalDateTime snoozed = LocalDateTime.of(2026, 11, 23, 8, 0);
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, snoozed));
        TaskRequest request = generalRequest();
        request.setTimeOfDay(LocalTime.of(8, 0));

        service.update(USER, TASK, request);

        CareTaskData data = updated();
        assertThat(data.getTankId()).isNull();
        assertThat(data.getNextDueAt()).isEqualTo(snoozed);
    }

    @Test
    void usingSomeoneElsesTankOnUpdateIsNotFoundAndWritesNothing() {
        TaskRequest request = request(RepeatType.DAILY, null, LocalTime.of(8, 0), null);
        request.setTankId(99L);
        when(tanks.findByIdAndUserId(99L, USER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(USER, TASK, request)).isInstanceOf(NotFoundException.class);
        verify(tasks, never()).update(anyLong(), anyLong(), any(), any());
    }

    @Test
    void getAndListGeneralAreScopedToTheUser() {
        when(tasks.findAllGeneralByUserId(USER)).thenReturn(List.of(
                entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, NOW)));
        when(tasks.findAllGeneralByUserId(OTHER_USER)).thenReturn(List.of());

        assertThat(service.get(USER, TASK).getId()).isEqualTo(TASK);
        assertThat(service.listGeneral(USER)).hasSize(1);
        assertThat(service.listGeneral(OTHER_USER)).isEmpty();
        assertThatThrownBy(() -> service.get(OTHER_USER, TASK)).isInstanceOf(NotFoundException.class);
    }

    // ---- complete and snooze (spec section 10, tests 2 to 7) ----

    private static final LocalDateTime DUE = LocalDateTime.of(2026, 11, 21, 8, 0);

    @Test
    void completingDailyOnTimeGivesTomorrowAtTheSameTimeAndLogsDone() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, DUE));

        service.complete(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 11, 22, 8, 0), NOW);
        verify(logs).insert(USER, TANK, TASK, "Cho an", CareResult.DONE, DUE, NOW);
    }

    @Test
    void completingDailyThreeDaysLateGivesTomorrowFromNow() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, DUE.minusDays(3)));

        service.complete(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 11, 22, 8, 0), NOW);
        verify(logs).insert(USER, TANK, TASK, "Cho an", CareResult.DONE, DUE.minusDays(3), NOW);
    }

    @Test
    void completingEveryNDaysCountsFromTheCompletionDay() {
        stored(entity(RepeatType.EVERY_N_DAYS, 7, LocalTime.of(19, 0), LocalDate.of(2026, 11, 1), true,
                LocalDateTime.of(2026, 11, 14, 19, 0)));

        service.complete(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 11, 28, 19, 0), NOW);
    }

    @Test
    void completingAOneOffTaskTurnsItOff() {
        stored(entity(RepeatType.ONCE, null, LocalTime.of(8, 0), LocalDate.of(2026, 11, 21), true, DUE));

        service.complete(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, false, null, NOW);
        verify(logs).insert(USER, TANK, TASK, "Cho an", CareResult.DONE, DUE, NOW);
    }

    @Test
    void snoozeMovesTheDueTimeOneDayLaterKeepingTheTimeAndLogsSnoozed() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, DUE));

        service.snooze(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 11, 22, 8, 0), NOW);
        verify(logs).insert(USER, TANK, TASK, "Cho an", CareResult.SNOOZED, DUE, NOW);
    }

    @Test
    void snoozingAnOverdueTaskStillEndsInTheFuture() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, DUE.minusDays(6)));

        service.snooze(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 11, 22, 8, 0), NOW);
    }

    @Test
    void snoozingATaskThatIsNotDueYetMovesItOneDayLaterKeepingTheTime() {
        LocalDateTime tonight = LocalDateTime.of(2026, 11, 21, 21, 0);
        stored(entity(RepeatType.DAILY, null, LocalTime.of(21, 0), null, true, tonight));

        service.snooze(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 11, 22, 21, 0), NOW);
        verify(logs).insert(USER, TANK, TASK, "Cho an", CareResult.SNOOZED, tonight, NOW);
    }

    @Test
    void completingATaskEarlyCountsFromTheDueDateSoTheRhythmIsKept() {
        // due on 24/11, completed early on 21/11: base = max(now, due) = 24/11, so the next one is 1/12 (not 28/11)
        stored(entity(RepeatType.EVERY_N_DAYS, 7, LocalTime.of(19, 0), LocalDate.of(2026, 11, 14), true,
                LocalDateTime.of(2026, 11, 24, 19, 0)));

        service.complete(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 12, 1, 19, 0), NOW);
    }

    @Test
    void completingADailyTaskThatIsNotDueYetGivesTomorrow() {
        LocalDateTime tonight = LocalDateTime.of(2026, 11, 21, 21, 0);
        stored(entity(RepeatType.DAILY, null, LocalTime.of(21, 0), null, true, tonight));

        service.complete(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 11, 22, 21, 0), NOW);
    }

    @Test
    void snoozingAOneOffTaskKeepsItOn() {
        stored(entity(RepeatType.ONCE, null, LocalTime.of(8, 0), LocalDate.of(2026, 11, 21), true, DUE));

        service.snooze(USER, TASK);

        verify(tasks).setEnabled(TASK, USER, true, LocalDateTime.of(2026, 11, 22, 8, 0), NOW);
    }

    @Test
    void completeAndSnoozeOfATurnedOffTaskAreRejectedAndWriteNothing() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, false, null));

        assertThatThrownBy(() -> service.complete(USER, TASK)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.snooze(USER, TASK)).isInstanceOf(ConflictException.class);
        verify(logs, never()).insert(anyLong(), any(), anyLong(), any(), any(), any(), any());
        verify(tasks, never()).setEnabled(anyLong(), anyLong(), any(Boolean.class), any(), any());
    }

    @Test
    void completeAndSnoozeOfSomeoneElsesTaskAreNotFoundAndWriteNothing() {
        assertThatThrownBy(() -> service.complete(OTHER_USER, TASK)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.snooze(OTHER_USER, TASK)).isInstanceOf(NotFoundException.class);
        verify(logs, never()).insert(anyLong(), any(), anyLong(), any(), any(), any(), any());
    }

    // ---- notifications are resolved ----

    @Test
    void completingSnoozingAndTurningOffResolveTheOpenNotifications() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, DUE));
        service.complete(USER, TASK);
        service.snooze(USER, TASK);
        service.setEnabled(USER, TASK, false);

        verify(notifications, times(3)).resolveOpenByTaskId(TASK, NOW);
    }

    @Test
    void turningATaskOnAgainClearsAnOldNotificationToo() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(18, 0), null, false, null));

        service.setEnabled(USER, TASK, true);

        verify(notifications).resolveOpenByTaskId(TASK, NOW);
    }

    @Test
    void changingTheTimingResolvesTheOldNotificationButEditingTextDoesNot() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, true, LocalDateTime.of(2026, 11, 22, 8, 0)));

        service.update(USER, TASK, request(RepeatType.DAILY, null, LocalTime.of(8, 0), null));
        verify(notifications, never()).resolveOpenByTaskId(anyLong(), any());

        service.update(USER, TASK, request(RepeatType.DAILY, null, LocalTime.of(18, 0), null));
        verify(notifications).resolveOpenByTaskId(TASK, NOW);
    }

    @Test
    void aTaskThatCannotBeCompletedResolvesNothing() {
        stored(entity(RepeatType.DAILY, null, LocalTime.of(8, 0), null, false, null));

        assertThatThrownBy(() -> service.complete(USER, TASK)).isInstanceOf(ConflictException.class);

        verify(notifications, never()).resolveOpenByTaskId(anyLong(), any());
    }

    @Test
    void aGeneralTaskIsLoggedWithoutATank() {
        stored(new CareTaskEntity(TASK, USER, null, TaskType.WATER_CHANGE, "Thay nuoc trun chi", null,
                RepeatType.DAILY, null, LocalTime.of(8, 0), null, null, 20, null, true, DUE, NOW, NOW));

        service.complete(USER, TASK);

        verify(logs).insert(USER, null, TASK, "Thay nuoc trun chi", CareResult.DONE, DUE, NOW);
    }
}
