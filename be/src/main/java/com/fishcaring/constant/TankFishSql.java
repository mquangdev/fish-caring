package com.fishcaring.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** SQL for the {@code tank_fish} table. Parameters are named (:name) and bound by the repository. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TankFishSql {

    public static final String INSERT = """
            INSERT INTO tank_fish (tank_id, species_name, quantity, status, created_at, updated_at)
            VALUES (:tankId, :speciesName, :quantity, :status, :now, :now)
            """;

    public static final String FIND_ALL_BY_TANK_ID = """
            SELECT id, tank_id, species_name, quantity, status, created_at, updated_at
            FROM tank_fish
            WHERE tank_id = :tankId
            ORDER BY id DESC
            """;

    public static final String DELETE_ALL_BY_TANK_ID = """
            DELETE FROM tank_fish
            WHERE tank_id = :tankId
            """;
}
