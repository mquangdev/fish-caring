package com.fishcaring.repository;

import com.fishcaring.constant.PushSubscriptionSql;
import com.fishcaring.entity.PushSubscriptionEntity;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PushSubscriptionRepository {

    private static final RowMapper<PushSubscriptionEntity> MAPPER = (rs, rowNum) -> new PushSubscriptionEntity(
            rs.getLong("id"),
            rs.getLong("user_id"),
            rs.getString("endpoint"),
            rs.getString("p256dh"),
            rs.getString("auth"),
            rs.getString("user_agent"),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getObject("updated_at", LocalDateTime.class));

    private final JdbcClient jdbc;

    public PushSubscriptionRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Fails with a duplicate-key error when the endpoint is already registered. */
    public long insert(long userId, String endpoint, String p256dh, String auth, String userAgent, LocalDateTime now) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.sql(PushSubscriptionSql.INSERT)
                .param("userId", userId)
                .param("endpoint", endpoint)
                .param("p256dh", p256dh)
                .param("auth", auth)
                .param("userAgent", userAgent)
                .param("now", now)
                .update(keys);
        return keys.getKey().longValue();
    }

    public List<PushSubscriptionEntity> findAllByUserId(long userId) {
        return jdbc.sql(PushSubscriptionSql.FIND_ALL_BY_USER_ID)
                .param("userId", userId)
                .query(MAPPER)
                .list();
    }

    public Optional<PushSubscriptionEntity> findByEndpoint(String endpoint) {
        return jdbc.sql(PushSubscriptionSql.FIND_BY_ENDPOINT)
                .param("endpoint", endpoint)
                .query(MAPPER)
                .optional();
    }

    /** Returns true when a subscription of this user was deleted. */
    public boolean deleteByEndpointAndUserId(String endpoint, long userId) {
        int rows = jdbc.sql(PushSubscriptionSql.DELETE_BY_ENDPOINT_AND_USER_ID)
                .param("endpoint", endpoint)
                .param("userId", userId)
                .update();
        return rows > 0;
    }
}
