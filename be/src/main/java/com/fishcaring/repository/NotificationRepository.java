package com.fishcaring.repository;

import com.fishcaring.constant.NotificationSql;
import com.fishcaring.entity.DueTaskEntity;
import com.fishcaring.entity.NotificationEntity;
import com.fishcaring.enums.NotificationStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository {

    private static final RowMapper<NotificationEntity> MAPPER = (rs, rowNum) -> new NotificationEntity(
            rs.getLong("id"),
            rs.getLong("user_id"),
            rs.getLong("task_id"),
            rs.getObject("due_at", LocalDateTime.class),
            rs.getString("message"),
            NotificationStatus.valueOf(rs.getString("status")),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getObject("updated_at", LocalDateTime.class));

    private static final RowMapper<DueTaskEntity> DUE_MAPPER = (rs, rowNum) -> new DueTaskEntity(
            rs.getLong("task_id"),
            rs.getLong("user_id"),
            rs.getString("title"),
            rs.getString("tank_name"),
            rs.getObject("next_due_at", LocalDateTime.class));

    private final JdbcClient jdbc;

    public NotificationRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Fails with a duplicate-key error when a notification for (task, dueAt) already exists. */
    public long insert(long userId, long taskId, LocalDateTime dueAt, String message, LocalDateTime now) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.sql(NotificationSql.INSERT)
                .param("userId", userId)
                .param("taskId", taskId)
                .param("dueAt", dueAt)
                .param("message", message)
                .param("status", NotificationStatus.UNREAD.name())
                .param("now", now)
                .update(keys);
        return keys.getKey().longValue();
    }

    public Optional<NotificationEntity> findByIdAndUserId(long id, long userId) {
        return jdbc.sql(NotificationSql.FIND_BY_ID_AND_USER_ID)
                .param("id", id)
                .param("userId", userId)
                .query(MAPPER)
                .optional();
    }

    public int countUnread(long userId) {
        return jdbc.sql(NotificationSql.COUNT_UNREAD_BY_USER_ID)
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    /** Returns true when an unread notification of this user became read. */
    public boolean markRead(long id, long userId, LocalDateTime now) {
        return jdbc.sql(NotificationSql.MARK_READ_BY_ID_AND_USER_ID)
                .param("id", id)
                .param("userId", userId)
                .param("now", now)
                .update() > 0;
    }

    public int markAllRead(long userId, LocalDateTime now) {
        return jdbc.sql(NotificationSql.MARK_ALL_READ_BY_USER_ID)
                .param("userId", userId)
                .param("now", now)
                .update();
    }

    /** Resolves the unresolved notifications of a task (done, snoozed, turned off or rescheduled). */
    public int resolveOpenByTaskId(long taskId, LocalDateTime now) {
        return jdbc.sql(NotificationSql.RESOLVE_OPEN_BY_TASK_ID)
                .param("taskId", taskId)
                .param("now", now)
                .update();
    }

    public List<DueTaskEntity> findDueWithoutOpenNotification(LocalDateTime notifyBefore, int limit) {
        return jdbc.sql(NotificationSql.FIND_DUE_WITHOUT_OPEN_NOTIFICATION)
                .param("notifyBefore", notifyBefore)
                .param("limit", limit)
                .query(DUE_MAPPER)
                .list();
    }

    public List<NotificationEntity> findRecentByUserId(long userId, int limit) {
        return jdbc.sql(NotificationSql.FIND_RECENT_BY_USER_ID)
                .param("userId", userId)
                .param("limit", limit)
                .query(MAPPER)
                .list();
    }
}
