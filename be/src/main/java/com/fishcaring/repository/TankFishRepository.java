package com.fishcaring.repository;

import com.fishcaring.constant.TankFishSql;
import com.fishcaring.entity.TankFishEntity;
import com.fishcaring.enums.FishStatus;
import com.fishcaring.object.TankFishData;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Fish rows belong to a tank. Callers must have verified the tank belongs to the current user
 * (see {@link TankRepository#findByIdAndUserId}) before using these methods.
 */
@Repository
public class TankFishRepository {

    private static final RowMapper<TankFishEntity> MAPPER = (rs, rowNum) -> new TankFishEntity(
            rs.getLong("id"),
            rs.getLong("tank_id"),
            rs.getString("species_name"),
            rs.getInt("quantity"),
            FishStatus.fromCode(rs.getInt("status")),
            rs.getObject("created_at", LocalDateTime.class),
            rs.getObject("updated_at", LocalDateTime.class));

    private final JdbcClient jdbc;

    public TankFishRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void insertAll(long tankId, List<TankFishData> fish, LocalDateTime now) {
        for (TankFishData item : fish) {
            jdbc.sql(TankFishSql.INSERT)
                    .param("tankId", tankId)
                    .param("speciesName", item.getSpeciesName())
                    .param("quantity", item.getQuantity())
                    .param("status", item.getStatus().code())
                    .param("now", now)
                    .update();
        }
    }

    public List<TankFishEntity> findAllByTankId(long tankId) {
        return jdbc.sql(TankFishSql.FIND_ALL_BY_TANK_ID)
                .param("tankId", tankId)
                .query(MAPPER)
                .list();
    }

    public void deleteAllByTankId(long tankId) {
        jdbc.sql(TankFishSql.DELETE_ALL_BY_TANK_ID)
                .param("tankId", tankId)
                .update();
    }
}
