package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** SQL for the {@code push_subscriptions} table. Parameters are named (:name) and bound by the repository. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class PushSubscriptionSql {

    public static final String INSERT = """
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at)
            VALUES (:userId, :endpoint, :p256dh, :auth, :userAgent, :now, :now)
            """;

    public static final String FIND_ALL_BY_USER_ID = """
            SELECT id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at
            FROM push_subscriptions
            WHERE user_id = :userId
            ORDER BY id
            """;

    public static final String FIND_BY_ENDPOINT = """
            SELECT id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at
            FROM push_subscriptions
            WHERE endpoint = :endpoint
            """;

    public static final String DELETE_BY_ENDPOINT_AND_USER_ID = """
            DELETE FROM push_subscriptions
            WHERE endpoint = :endpoint AND user_id = :userId
            """;
}
