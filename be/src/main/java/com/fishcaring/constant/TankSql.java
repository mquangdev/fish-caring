package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** SQL for the {@code tanks} table. Parameters are named (:name) and bound by the repository. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TankSql {

    public static final String INSERT = """
            INSERT INTO tanks (user_id, name, volume_liters, length_cm, width_cm, height_cm, setup_date, note,
                               created_at, updated_at)
            VALUES (:userId, :name, :volumeLiters, :lengthCm, :widthCm, :heightCm, :setupDate, :note, :now, :now)
            """;

    public static final String UPDATE = """
            UPDATE tanks
            SET name = :name, volume_liters = :volumeLiters, length_cm = :lengthCm, width_cm = :widthCm,
                height_cm = :heightCm, setup_date = :setupDate, note = :note, updated_at = :now
            WHERE id = :tankId AND user_id = :userId
            """;

    public static final String FIND_BY_ID_AND_USER_ID = """
            SELECT id, user_id, name, volume_liters, length_cm, width_cm, height_cm, setup_date, note,
                   created_at, updated_at
            FROM tanks
            WHERE id = :tankId AND user_id = :userId
            """;

    /** Tank list: each tank with its number of care tasks and the earliest due time of its enabled tasks. */
    public static final String FIND_ALL_SUMMARIES_BY_USER_ID = """
            SELECT k.id, k.name, k.volume_liters, k.created_at,
                   (SELECT COUNT(*) FROM care_tasks t WHERE t.tank_id = k.id) AS task_count,
                   (SELECT MIN(t.next_due_at) FROM care_tasks t WHERE t.tank_id = k.id AND t.enabled = TRUE) AS next_due_at
            FROM tanks k
            WHERE k.user_id = :userId
            ORDER BY k.created_at DESC, k.id DESC
            """;

    public static final String DELETE_BY_ID_AND_USER_ID = """
            DELETE FROM tanks
            WHERE id = :tankId AND user_id = :userId
            """;
}
