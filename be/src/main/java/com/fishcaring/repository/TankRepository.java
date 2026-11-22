package com.fishcaring.repository;

import com.fishcaring.constant.TankSql;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.entity.TankSummaryEntity;
import com.fishcaring.object.TankData;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class TankRepository {

    private static final RowMapper<TankEntity> MAPPER = (rs, rowNum) -> new TankEntity(
            rs.getLong("id"),
            rs.getLong("user_id"),
            rs.getString("name"),
            rs.getBigDecimal("volume_liters"),
            rs.getBigDecimal("length_cm"),
            rs.getBigDecimal("width_cm"),
            rs.getBigDecimal("height_cm"),
            rs.getObject("setup_date", LocalDate.class),
            rs.getString("note"),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getObject("updated_at", LocalDateTime.class));

    private static final RowMapper<TankSummaryEntity> SUMMARY_MAPPER = (rs, rowNum) -> new TankSummaryEntity(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getBigDecimal("volume_liters"),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getInt("task_count"),
            rs.getObject("next_due_at", LocalDateTime.class));

    private final JdbcClient jdbc;

    public TankRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public long insert(long userId, TankData data, LocalDateTime now) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.sql(TankSql.INSERT)
                .param("userId", userId)
                .param("name", data.getName())
                .param("volumeLiters", data.getVolumeLiters())
                .param("lengthCm", data.getLengthCm())
                .param("widthCm", data.getWidthCm())
                .param("heightCm", data.getHeightCm())
                .param("setupDate", data.getSetupDate())
                .param("note", data.getNote())
                .param("now", now)
                .update(keys);
        return keys.getKey().longValue();
    }

    /** Returns true when a tank of this user was updated. */
    public boolean update(long tankId, long userId, TankData data, LocalDateTime now) {
        int rows = jdbc.sql(TankSql.UPDATE)
                .param("tankId", tankId)
                .param("userId", userId)
                .param("name", data.getName())
                .param("volumeLiters", data.getVolumeLiters())
                .param("lengthCm", data.getLengthCm())
                .param("widthCm", data.getWidthCm())
                .param("heightCm", data.getHeightCm())
                .param("setupDate", data.getSetupDate())
                .param("note", data.getNote())
                .param("now", now)
                .update();
        return rows > 0;
    }

    public Optional<TankEntity> findByIdAndUserId(long tankId, long userId) {
        return jdbc.sql(TankSql.FIND_BY_ID_AND_USER_ID)
                .param("tankId", tankId)
                .param("userId", userId)
                .query(MAPPER)
                .optional();
    }

    /** The user's tanks, newest first, each with its task count and earliest due time. */
    public List<TankSummaryEntity> findAllSummariesByUserId(long userId) {
        return jdbc.sql(TankSql.FIND_ALL_SUMMARIES_BY_USER_ID)
                .param("userId", userId)
                .query(SUMMARY_MAPPER)
                .list();
    }

    /** Returns true when a tank of this user was deleted. Child rows are removed by the database. */
    public boolean deleteByIdAndUserId(long tankId, long userId) {
        int rows = jdbc.sql(TankSql.DELETE_BY_ID_AND_USER_ID)
                .param("tankId", tankId)
                .param("userId", userId)
                .update();
        return rows > 0;
    }
}
