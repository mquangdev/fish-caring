package com.fishcaring.repository;

import com.fishcaring.constant.CareTaskSql;
import com.fishcaring.entity.CareTaskEntity;
import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import com.fishcaring.object.CareTaskData;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/**
 * Tasks have no {@code user_id}; ownership is checked through the tank they belong to, so every
 * lookup that takes a task id also takes the user id.
 */
@Repository
public class CareTaskRepository {

    private static final RowMapper<CareTaskEntity> MAPPER = (rs, rowNum) -> new CareTaskEntity(
            rs.getLong("id"),
            rs.getLong("tank_id"),
            TaskType.valueOf(rs.getString("type")),
            rs.getString("title"),
            rs.getString("note"),
            RepeatType.valueOf(rs.getString("repeat_type")),
            rs.getObject("interval_days", Integer.class),
            rs.getObject("time_of_day", LocalTime.class),
            rs.getObject("start_date", LocalDate.class),
            rs.getBoolean("enabled"),
            rs.getObject("next_due_at", LocalDateTime.class),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getObject("updated_at", LocalDateTime.class));

    private final JdbcClient jdbc;

    public CareTaskRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The caller must have verified that the tank belongs to the current user. */
    public long insert(long tankId, CareTaskData data, LocalDateTime now) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.sql(CareTaskSql.INSERT)
                .param("tankId", tankId)
                .param("type", data.getType().name())
                .param("title", data.getTitle())
                .param("note", data.getNote())
                .param("repeatType", data.getRepeatType().name())
                .param("intervalDays", data.getIntervalDays())
                .param("timeOfDay", data.getTimeOfDay())
                .param("startDate", data.getStartDate())
                .param("enabled", data.getEnabled())
                .param("nextDueAt", data.getNextDueAt())
                .param("now", now)
                .update(keys);
        return keys.getKey().longValue();
    }

    /** Returns true when a task of this user was updated. */
    public boolean update(long taskId, long userId, CareTaskData data, LocalDateTime now) {
        int rows = jdbc.sql(CareTaskSql.UPDATE)
                .param("taskId", taskId)
                .param("userId", userId)
                .param("type", data.getType().name())
                .param("title", data.getTitle())
                .param("note", data.getNote())
                .param("repeatType", data.getRepeatType().name())
                .param("intervalDays", data.getIntervalDays())
                .param("timeOfDay", data.getTimeOfDay())
                .param("startDate", data.getStartDate())
                .param("enabled", data.getEnabled())
                .param("nextDueAt", data.getNextDueAt())
                .param("now", now)
                .update();
        return rows > 0;
    }

    public Optional<CareTaskEntity> findByIdAndUserId(long taskId, long userId) {
        return jdbc.sql(CareTaskSql.FIND_BY_ID_AND_USER_ID)
                .param("taskId", taskId)
                .param("userId", userId)
                .query(MAPPER)
                .optional();
    }

    /** The caller must have verified that the tank belongs to the current user. */
    public List<CareTaskEntity> findAllByTankId(long tankId) {
        return jdbc.sql(CareTaskSql.FIND_ALL_BY_TANK_ID)
                .param("tankId", tankId)
                .query(MAPPER)
                .list();
    }

    public int countByTankId(long tankId) {
        return jdbc.sql(CareTaskSql.COUNT_BY_TANK_ID)
                .param("tankId", tankId)
                .query(Integer.class)
                .single();
    }

    /** Returns true when a task of this user was updated. */
    public boolean setEnabled(long taskId, long userId, boolean enabled, LocalDateTime nextDueAt, LocalDateTime now) {
        int rows = jdbc.sql(CareTaskSql.UPDATE_ENABLED)
                .param("taskId", taskId)
                .param("userId", userId)
                .param("enabled", enabled)
                .param("nextDueAt", nextDueAt)
                .param("now", now)
                .update();
        return rows > 0;
    }

    /** Returns true when a task of this user was deleted. Logs keep their row with a null task id. */
    public boolean deleteByIdAndUserId(long taskId, long userId) {
        int rows = jdbc.sql(CareTaskSql.DELETE_BY_ID_AND_USER_ID)
                .param("taskId", taskId)
                .param("userId", userId)
                .update();
        return rows > 0;
    }
}
