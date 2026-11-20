package com.fishcaring.repository;

import com.fishcaring.constant.CareLogSql;
import com.fishcaring.entity.CareLogEntity;
import com.fishcaring.enums.CareResult;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/** The caller must have verified that the tank belongs to the current user. */
@Repository
public class CareLogRepository {

    private static final RowMapper<CareLogEntity> MAPPER = (rs, rowNum) -> new CareLogEntity(
            rs.getLong("id"),
            rs.getLong("tank_id"),
            rs.getObject("task_id", Long.class),
            rs.getString("task_title"),
            CareResult.valueOf(rs.getString("result")),
            rs.getObject("due_at", LocalDateTime.class),
            rs.getObject("acted_at", LocalDateTime.class),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getObject("updated_at", LocalDateTime.class));

    private final JdbcClient jdbc;

    public CareLogRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public long insert(long tankId, long taskId, String taskTitle, CareResult result,
                       LocalDateTime dueAt, LocalDateTime now) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.sql(CareLogSql.INSERT)
                .param("tankId", tankId)
                .param("taskId", taskId)
                .param("taskTitle", taskTitle)
                .param("result", result.name())
                .param("dueAt", dueAt)
                .param("now", now)
                .update(keys);
        return keys.getKey().longValue();
    }

    public List<CareLogEntity> findRecentByTankId(long tankId, int limit) {
        return jdbc.sql(CareLogSql.FIND_RECENT_BY_TANK_ID)
                .param("tankId", tankId)
                .param("limit", limit)
                .query(MAPPER)
                .list();
    }
}
