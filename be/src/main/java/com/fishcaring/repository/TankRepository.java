package com.fishcaring.repository;

import com.fishcaring.constant.TankSql;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.enums.TankType;
import com.fishcaring.object.TankData;
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
            rs.getObject("volume_liters", Integer.class),
            TankType.valueOf(rs.getString("type")),
            rs.getObject("setup_date", LocalDate.class),
            rs.getString("note"),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getObject("updated_at", LocalDateTime.class));

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
                .param("type", data.getType().name())
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
                .param("type", data.getType().name())
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

    public List<TankEntity> findAllByUserId(long userId) {
        return jdbc.sql(TankSql.FIND_ALL_BY_USER_ID)
                .param("userId", userId)
                .query(MAPPER)
                .list();
    }

    public int countByUserId(long userId) {
        return jdbc.sql(TankSql.COUNT_BY_USER_ID)
                .param("userId", userId)
                .query(Integer.class)
                .single();
    }

    /**
     * Case-insensitive name check within one user. Pass the tank's own id as {@code excludeTankId}
     * when editing so the tank does not conflict with itself; pass null when creating.
     */
    public boolean existsByUserIdAndNameIgnoreCase(long userId, String name, Long excludeTankId) {
        Integer count;
        if (excludeTankId == null) {
            count = jdbc.sql(TankSql.COUNT_BY_USER_ID_AND_NAME_IGNORE_CASE)
                    .param("userId", userId)
                    .param("name", name)
                    .query(Integer.class)
                    .single();
        } else {
            count = jdbc.sql(TankSql.COUNT_BY_USER_ID_AND_NAME_IGNORE_CASE_EXCLUDING_ID)
                    .param("userId", userId)
                    .param("name", name)
                    .param("excludeTankId", excludeTankId)
                    .query(Integer.class)
                    .single();
        }
        return count > 0;
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
