package com.fishcaring.repository;

import com.fishcaring.constant.CareTaskSql;
import com.fishcaring.entity.CareTaskEntity;
import com.fishcaring.entity.TodayItemEntity;
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
 * A task has its own {@code user_id} (it may belong to no tank), so every
 * lookup that takes a task id also takes the user id.
 */
@Repository
public class CareTaskRepository {

    private static final RowMapper<CareTaskEntity> MAPPER = (rs, rowNum) -> new CareTaskEntity(
            rs.getLong("id"),
            rs.getLong("user_id"),
            rs.getObject("tank_id", Long.class),
            TaskType.valueOf(rs.getString("type")),
            rs.getString("title"),
            rs.getString("note"),
            RepeatType.valueOf(rs.getString("repeat_type")),
            rs.getObject("interval_days", Integer.class),
            rs.getObject("time_of_day", LocalTime.class),
            rs.getObject("start_date", LocalDate.class),
            rs.getString("food_name"),
            rs.getObject("water_change_percent", Integer.class),
            rs.getBigDecimal("fertilizer_ml"),
            rs.getBoolean("enabled"),
            rs.getObject("next_due_at", LocalDateTime.class),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getObject("updated_at", LocalDateTime.class));

    private static final RowMapper<TodayItemEntity> TODAY_MAPPER = (rs, rowNum) -> new TodayItemEntity(
            rs.getLong("id"),
            rs.getObject("tank_id", Long.class),
            rs.getString("tank_name"),
            TaskType.valueOf(rs.getString("type")),
            rs.getString("title"),
            rs.getString("note"),
            RepeatType.valueOf(rs.getString("repeat_type")),
            rs.getObject("time_of_day", LocalTime.class),
            rs.getString("food_name"),
            rs.getObject("water_change_percent", Integer.class),
            rs.getBigDecimal("fertilizer_ml"),
            rs.getObject("next_due_at", LocalDateTime.class));

    private final JdbcClient jdbc;

    public CareTaskRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The caller must have verified that the tank (if any) belongs to the user. */
    public long insert(long userId, CareTaskData data, LocalDateTime now) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.sql(CareTaskSql.INSERT)
                .param("userId", userId)
                .param("tankId", data.getTankId())
                .param("type", data.getType().name())
                .param("title", data.getTitle())
                .param("note", data.getNote())
                .param("repeatType", data.getRepeatType().name())
                .param("intervalDays", data.getIntervalDays())
                .param("timeOfDay", data.getTimeOfDay())
                .param("startDate", data.getStartDate())
                .param("foodName", data.getFoodName())
                .param("waterChangePercent", data.getWaterChangePercent())
                .param("fertilizerMl", data.getFertilizerMl())
                .param("enabled", data.getEnabled())
                .param("nextDueAt", data.getNextDueAt())
                .param("now", now)
                .update(keys);
        return keys.getKey().longValue();
    }

    /** Returns true when a task of this user was updated. The tank (if any) must belong to the user. */
    public boolean update(long taskId, long userId, CareTaskData data, LocalDateTime now) {
        int rows = jdbc.sql(CareTaskSql.UPDATE)
                .param("taskId", taskId)
                .param("userId", userId)
                .param("tankId", data.getTankId())
                .param("type", data.getType().name())
                .param("title", data.getTitle())
                .param("note", data.getNote())
                .param("repeatType", data.getRepeatType().name())
                .param("intervalDays", data.getIntervalDays())
                .param("timeOfDay", data.getTimeOfDay())
                .param("startDate", data.getStartDate())
                .param("foodName", data.getFoodName())
                .param("waterChangePercent", data.getWaterChangePercent())
                .param("fertilizerMl", data.getFertilizerMl())
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

    /** Enabled tasks of the user due before {@code until} (overdue ones included), oldest first. */
    public List<TodayItemEntity> findActiveUntilByUserId(long userId, LocalDateTime until) {
        return jdbc.sql(CareTaskSql.FIND_ACTIVE_UNTIL_BY_USER_ID)
                .param("userId", userId)
                .param("until", until)
                .query(TODAY_MAPPER)
                .list();
    }

    /** Tasks that belong to no tank, in display order. */
    public List<CareTaskEntity> findAllGeneralByUserId(long userId) {
        return jdbc.sql(CareTaskSql.FIND_ALL_GENERAL_BY_USER_ID)
                .param("userId", userId)
                .query(MAPPER)
                .list();
    }

    /** The caller must have verified that the tank belongs to the current user. */
    public List<CareTaskEntity> findAllByTankId(long tankId) {
        return jdbc.sql(CareTaskSql.FIND_ALL_BY_TANK_ID)
                .param("tankId", tankId)
                .query(MAPPER)
                .list();
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
