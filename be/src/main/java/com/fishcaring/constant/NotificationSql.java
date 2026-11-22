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

    public static final String COUNT_UNREAD_BY_USER_ID = """
            SELECT COUNT(*)
            FROM notifications
            WHERE user_id = :userId AND status = 'UNREAD'
            """;

    public static final String MARK_READ_BY_ID_AND_USER_ID = """
            UPDATE notifications
            SET status = 'READ', updated_at = :now
            WHERE id = :id AND user_id = :userId AND status = 'UNREAD'
            """;

    public static final String MARK_ALL_READ_BY_USER_ID = """
            UPDATE notifications
            SET status = 'READ', updated_at = :now
            WHERE user_id = :userId AND status = 'UNREAD'
            """;

    /** Turns the unresolved (unread or read) notifications of a task into resolved ones. */
    public static final String RESOLVE_OPEN_BY_TASK_ID = """
            UPDATE notifications
            SET status = 'RESOLVED', updated_at = :now
            WHERE task_id = :taskId AND status IN ('UNREAD', 'READ')
            """;

    /**
     * Enabled tasks due before {@code :notifyBefore} that have no unresolved notification yet, so a
     * task that is overdue for days gets one notification only.
     */
    public static final String FIND_DUE_WITHOUT_OPEN_NOTIFICATION = """
            SELECT t.id AS task_id, t.user_id, t.title, k.name AS tank_name, t.next_due_at
            FROM care_tasks t
            LEFT JOIN tanks k ON k.id = t.tank_id
            WHERE t.enabled = TRUE
              AND t.next_due_at <= :notifyBefore
              AND NOT EXISTS (
                  SELECT 1 FROM notifications n
                  WHERE n.task_id = t.id AND n.status IN ('UNREAD', 'READ'))
            ORDER BY t.next_due_at, t.id
            LIMIT :limit
            """;
}
