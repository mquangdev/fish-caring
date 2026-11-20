package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** SQL for the {@code notifications} table. Parameters are named (:name) and bound by the repository. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class NotificationSql {

    public static final String INSERT = """
            INSERT INTO notifications (user_id, task_id, due_at, message, status, created_at, updated_at)
            VALUES (:userId, :taskId, :dueAt, :message, :status, :now, :now)
            """;

    public static final String FIND_BY_ID_AND_USER_ID = """
            SELECT id, user_id, task_id, due_at, message, status, created_at, updated_at
            FROM notifications
            WHERE id = :id AND user_id = :userId
            """;

    public static final String FIND_RECENT_BY_USER_ID = """
            SELECT id, user_id, task_id, due_at, message, status, created_at, updated_at
            FROM notifications
            WHERE user_id = :userId
            ORDER BY created_at DESC, id DESC
            LIMIT :limit
            """;
}
