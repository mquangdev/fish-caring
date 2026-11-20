package com.fishcaring.repository;

import com.fishcaring.constant.NotificationSql;
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

    public List<NotificationEntity> findRecentByUserId(long userId, int limit) {
        return jdbc.sql(NotificationSql.FIND_RECENT_BY_USER_ID)
                .param("userId", userId)
                .param("limit", limit)
                .query(MAPPER)
                .list();
    }
}
