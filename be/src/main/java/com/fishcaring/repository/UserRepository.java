package com.fishcaring.repository;

import com.fishcaring.constant.UserSql;
import com.fishcaring.entity.UserEntity;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private static final RowMapper<UserEntity> MAPPER = (rs, rowNum) -> new UserEntity(
            rs.getLong("id"),
            rs.getString("email"),
            rs.getString("password_hash"),
            rs.getString("display_name"),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getObject("updated_at", LocalDateTime.class));

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public long insert(String email, String passwordHash, String displayName, LocalDateTime now) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.sql(UserSql.INSERT)
                .param("email", email)
                .param("passwordHash", passwordHash)
                .param("displayName", displayName)
                .param("now", now)
                .update(keys);
        return keys.getKey().longValue();
    }

    public Optional<UserEntity> findById(long id) {
        return jdbc.sql(UserSql.FIND_BY_ID)
                .param("id", id)
                .query(MAPPER)
                .optional();
    }

    public Optional<UserEntity> findByEmail(String email) {
        return jdbc.sql(UserSql.FIND_BY_EMAIL)
                .param("email", email)
                .query(MAPPER)
                .optional();
    }

    public boolean existsByEmail(String email) {
        Integer count = jdbc.sql(UserSql.COUNT_BY_EMAIL)
                .param("email", email)
                .query(Integer.class)
                .single();
        return count > 0;
    }

    /** Returns true when the user exists and was updated. */
    public boolean updateDisplayName(long id, String displayName, LocalDateTime now) {
        int rows = jdbc.sql(UserSql.UPDATE_DISPLAY_NAME)
                .param("id", id)
                .param("displayName", displayName)
                .param("now", now)
                .update();
        return rows > 0;
    }
}
