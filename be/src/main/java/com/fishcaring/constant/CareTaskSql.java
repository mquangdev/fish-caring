package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * SQL for the {@code care_tasks} table. Tasks have no user_id, so ownership is checked through
 * the tank they belong to. Parameters are named (:name) and bound by the repository.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class CareTaskSql {

    public static final String INSERT = """
            INSERT INTO care_tasks (tank_id, type, title, note, repeat_type, interval_days, time_of_day,
                                    start_date, enabled, next_due_at, created_at, updated_at)
            VALUES (:tankId, :type, :title, :note, :repeatType, :intervalDays, :timeOfDay,
                    :startDate, :enabled, :nextDueAt, :now, :now)
            """;

    public static final String UPDATE = """
            UPDATE care_tasks
            SET type = :type, title = :title, note = :note, repeat_type = :repeatType,
                interval_days = :intervalDays, time_of_day = :timeOfDay, start_date = :startDate,
                enabled = :enabled, next_due_at = :nextDueAt, updated_at = :now
            WHERE id = :taskId
              AND tank_id IN (SELECT id FROM tanks WHERE user_id = :userId)
            """;

    public static final String FIND_BY_ID_AND_USER_ID = """
            SELECT t.id, t.tank_id, t.type, t.title, t.note, t.repeat_type, t.interval_days, t.time_of_day,
                   t.start_date, t.enabled, t.next_due_at, t.created_at, t.updated_at
            FROM care_tasks t
            JOIN tanks k ON k.id = t.tank_id
            WHERE t.id = :taskId AND k.user_id = :userId
            """;

    public static final String FIND_ALL_BY_TANK_ID = """
            SELECT id, tank_id, type, title, note, repeat_type, interval_days, time_of_day,
                   start_date, enabled, next_due_at, created_at, updated_at
            FROM care_tasks
            WHERE tank_id = :tankId
            ORDER BY created_at, id
            """;

    public static final String COUNT_BY_TANK_ID = """
            SELECT COUNT(*)
            FROM care_tasks
            WHERE tank_id = :tankId
            """;

    public static final String UPDATE_ENABLED = """
            UPDATE care_tasks
            SET enabled = :enabled, next_due_at = :nextDueAt, updated_at = :now
            WHERE id = :taskId
              AND tank_id IN (SELECT id FROM tanks WHERE user_id = :userId)
            """;

    public static final String DELETE_BY_ID_AND_USER_ID = """
            DELETE FROM care_tasks
            WHERE id = :taskId
              AND tank_id IN (SELECT id FROM tanks WHERE user_id = :userId)
            """;
}
