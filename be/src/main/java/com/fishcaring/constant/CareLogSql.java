package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** SQL for the {@code care_logs} table. Parameters are named (:name) and bound by the repository. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class CareLogSql {

    public static final String INSERT = """
            INSERT INTO care_logs (tank_id, task_id, task_title, result, due_at, acted_at, created_at, updated_at)
            VALUES (:tankId, :taskId, :taskTitle, :result, :dueAt, :now, :now, :now)
            """;

    public static final String FIND_RECENT_BY_TANK_ID = """
            SELECT id, tank_id, task_id, task_title, result, due_at, acted_at, created_at, updated_at
            FROM care_logs
            WHERE tank_id = :tankId
            ORDER BY acted_at DESC, id DESC
            LIMIT :limit
            """;
}
