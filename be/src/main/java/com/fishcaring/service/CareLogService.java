package com.fishcaring.service;

import com.fishcaring.dto.CareLogResponse;
import com.fishcaring.exception.NotFoundException;
import com.fishcaring.mapper.CareLogMapper;
import com.fishcaring.repository.CareLogRepository;
import com.fishcaring.repository.TankRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/** The care history of a tank or of the tasks without a tank. Scoped to the given user. */
@Service
public class CareLogService {

    static final int DEFAULT_LIMIT = 50;
    static final int MAX_LIMIT = 100;

    private final TankRepository tanks;
    private final CareLogRepository logs;
    private final CareLogMapper mapper;

    public CareLogService(TankRepository tanks, CareLogRepository logs, CareLogMapper mapper) {
        this.tanks = tanks;
        this.logs = logs;
        this.mapper = mapper;
    }

    public List<CareLogResponse> tankLogs(long userId, long tankId, Integer limit) {
        if (tanks.findByIdAndUserId(tankId, userId).isEmpty()) {
            throw new NotFoundException("Tank not found");
        }
        return logs.findRecentByTankId(tankId, userId, clamp(limit)).stream().map(mapper::toResponse).toList();
    }

    public List<CareLogResponse> generalLogs(long userId, Integer limit) {
        return logs.findRecentGeneralByUserId(userId, clamp(limit)).stream().map(mapper::toResponse).toList();
    }

    /** No limit means 50; anything outside 1 to 100 is moved into that range. */
    static int clamp(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        return Math.max(1, Math.min(MAX_LIMIT, limit));
    }
}
