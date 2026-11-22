package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * SQL for the {@code care_tasks} table. A task has its own {@code user_id} (it may belong to no
 * tank), so ownership is checked directly. Parameters are named (:name) and bound by the repository.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class CareTaskSql {

    public static final String INSERT = """
            INSERT INTO care_tasks (user_id, tank_id, type, title, note, repeat_type, interval_days, time_of_day,
                                    start_date, food_name, water_change_percent, fertilizer_ml,
                                    enabled, next_due_at, created_at, updated_at)
            VALUES (:userId, :tankId, :type, :title, :note, :repeatType, :intervalDays, :timeOfDay,
                    :startDate, :foodName, :waterChangePercent, :fertilizerMl,
                    :enabled, :nextDueAt, :now, :now)
            """;

    public static final String UPDATE = """
            UPDATE care_tasks
            SET tank_id = :tankId, type = :type, title = :title, note = :note, repeat_type = :repeatType,
                interval_days = :intervalDays, time_of_day = :timeOfDay, start_date = :startDate,
                food_name = :foodName, water_change_percent = :waterChangePercent,
                fertilizer_ml = :fertilizerMl, enabled = :enabled, next_due_at = :nextDueAt, updated_at = :now
            WHERE id = :taskId AND user_id = :userId
            """;

    public static final String FIND_BY_ID_AND_USER_ID = """
            SELECT id, user_id, tank_id, type, title, note, repeat_type, interval_days, time_of_day,
                   start_date, food_name, water_change_percent, fertilizer_ml,
                   enabled, next_due_at, created_at, updated_at
            FROM care_tasks
            WHERE id = :taskId AND user_id = :userId
            """;

    public static final String FIND_ALL_BY_TANK_ID = """
            SELECT id, user_id, tank_id, type, title, note, repeat_type, interval_days, time_of_day,
                   start_date, food_name, water_change_percent, fertilizer_ml,
                   enabled, next_due_at, created_at, updated_at
            FROM care_tasks
            WHERE tank_id = :tankId
            ORDER BY enabled DESC, next_due_at IS NULL, next_due_at, id
            """;

    public static final String FIND_ALL_GENERAL_BY_USER_ID = """
            SELECT id, user_id, tank_id, type, title, note, repeat_type, interval_days, time_of_day,
                   start_date, food_name, water_change_percent, fertilizer_ml,
                   enabled, next_due_at, created_at, updated_at
            FROM care_tasks
            WHERE user_id = :userId AND tank_id IS NULL
            ORDER BY enabled DESC, next_due_at IS NULL, next_due_at, id
            """;

    public static final String UPDATE_ENABLED = """
            UPDATE care_tasks
            SET enabled = :enabled, next_due_at = :nextDueAt, updated_at = :now
            WHERE id = :taskId AND user_id = :userId
            """;

    public static final String DELETE_BY_ID_AND_USER_ID = """
            DELETE FROM care_tasks
            WHERE id = :taskId AND user_id = :userId
            """;
}
