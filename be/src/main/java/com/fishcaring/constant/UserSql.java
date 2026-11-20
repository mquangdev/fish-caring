package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** SQL for the {@code users} table. Parameters are named (:name) and bound by the repository. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class UserSql {

    public static final String INSERT = """
            INSERT INTO users (email, password_hash, display_name, created_at, updated_at)
            VALUES (:email, :passwordHash, :displayName, :now, :now)
            """;

    public static final String FIND_BY_ID = """
            SELECT id, email, password_hash, display_name, created_at, updated_at
            FROM users
            WHERE id = :id
            """;

    public static final String FIND_BY_EMAIL = """
            SELECT id, email, password_hash, display_name, created_at, updated_at
            FROM users
            WHERE email = :email
            """;

    public static final String COUNT_BY_EMAIL = """
            SELECT COUNT(*)
            FROM users
            WHERE email = :email
            """;
}
