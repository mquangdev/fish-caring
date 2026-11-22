package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * SQL for the {@code care_logs} table. A log has its own {@code user_id} and a nullable
 * {@code tank_id} (null for a task without a tank). Parameters are named (:name).
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class CareLogSql {

    public static final String INSERT = """
            INSERT INTO care_logs (user_id, tank_id, task_id, task_title, result, due_at, acted_at, created_at, updated_at)
            VALUES (:userId, :tankId, :taskId, :taskTitle, :result, :dueAt, :now, :now, :now)
            """;

    public static final String FIND_RECENT_BY_TANK_ID = """
            SELECT id, user_id, tank_id, task_id, task_title, result, due_at, acted_at, created_at, updated_at
            FROM care_logs
            WHERE tank_id = :tankId AND user_id = :userId
            ORDER BY acted_at DESC, id DESC
            LIMIT :limit
            """;

    public static final String FIND_RECENT_GENERAL_BY_USER_ID = """
            SELECT id, user_id, tank_id, task_id, task_title, result, due_at, acted_at, created_at, updated_at
            FROM care_logs
            WHERE user_id = :userId AND tank_id IS NULL
            ORDER BY acted_at DESC, id DESC
            LIMIT :limit
            """;
}
