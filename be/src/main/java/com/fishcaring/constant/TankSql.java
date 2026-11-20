package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** SQL for the {@code tanks} table. Parameters are named (:name) and bound by the repository. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TankSql {

    public static final String INSERT = """
            INSERT INTO tanks (user_id, name, volume_liters, type, setup_date, note, created_at, updated_at)
            VALUES (:userId, :name, :volumeLiters, :type, :setupDate, :note, :now, :now)
            """;

    public static final String UPDATE = """
            UPDATE tanks
            SET name = :name, volume_liters = :volumeLiters, type = :type,
                setup_date = :setupDate, note = :note, updated_at = :now
            WHERE id = :tankId AND user_id = :userId
            """;

    public static final String FIND_BY_ID_AND_USER_ID = """
            SELECT id, user_id, name, volume_liters, type, setup_date, note, created_at, updated_at
            FROM tanks
            WHERE id = :tankId AND user_id = :userId
            """;

    public static final String FIND_ALL_BY_USER_ID = """
            SELECT id, user_id, name, volume_liters, type, setup_date, note, created_at, updated_at
            FROM tanks
            WHERE user_id = :userId
            ORDER BY created_at DESC, id DESC
            """;

    public static final String COUNT_BY_USER_ID = """
            SELECT COUNT(*)
            FROM tanks
            WHERE user_id = :userId
            """;

    public static final String COUNT_BY_USER_ID_AND_NAME_IGNORE_CASE = """
            SELECT COUNT(*)
            FROM tanks
            WHERE user_id = :userId AND LOWER(name) = LOWER(:name)
            """;

    public static final String COUNT_BY_USER_ID_AND_NAME_IGNORE_CASE_EXCLUDING_ID = """
            SELECT COUNT(*)
            FROM tanks
            WHERE user_id = :userId AND LOWER(name) = LOWER(:name) AND id <> :excludeTankId
            """;

    public static final String DELETE_BY_ID_AND_USER_ID = """
            DELETE FROM tanks
            WHERE id = :tankId AND user_id = :userId
            """;
}
