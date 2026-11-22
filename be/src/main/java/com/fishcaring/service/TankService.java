package com.fishcaring.service;

import com.fishcaring.dto.TankRequest;
import com.fishcaring.dto.TankResponse;
import com.fishcaring.dto.TankSummaryResponse;
import com.fishcaring.entity.TankEntity;
import com.fishcaring.exception.NotFoundException;
import com.fishcaring.exception.ValidationException;
import com.fishcaring.mapper.TankMapper;
import com.fishcaring.object.TankFishData;
import com.fishcaring.repository.TankFishRepository;
import com.fishcaring.repository.TankRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Tank and fish management. Every method is scoped to the given user; other users' tanks are 404. */
@Service
public class TankService {

    private static final String NOT_FOUND = "Tank not found";

    private final TankRepository tanks;
    private final TankFishRepository fish;
    private final TankMapper mapper;
    private final Clock clock;

    public TankService(TankRepository tanks, TankFishRepository fish, TankMapper mapper, Clock clock) {
        this.tanks = tanks;
        this.fish = fish;
        this.mapper = mapper;
        this.clock = clock;
    }

    public List<TankSummaryResponse> list(long userId) {
        return tanks.findAllSummariesByUserId(userId).stream().map(mapper::toSummary).toList();
    }

    public TankResponse get(long userId, long tankId) {
        return toResponse(load(userId, tankId));
    }

    @Transactional
    public TankResponse create(long userId, TankRequest request) {
        LocalDateTime now = LocalDateTime.now(clock);
        long tankId = tanks.insert(userId, mapper.toData(request, resolveVolume(request)), now);
        saveFish(tankId, request, now);
        return toResponse(load(userId, tankId));
    }

    @Transactional
    public TankResponse update(long userId, long tankId, TankRequest request) {
        LocalDateTime now = LocalDateTime.now(clock);
        if (!tanks.update(tankId, userId, mapper.toData(request, resolveVolume(request)), now)) {
            throw new NotFoundException(NOT_FOUND);
        }
        fish.deleteAllByTankId(tankId);
        saveFish(tankId, request, now);
        return toResponse(load(userId, tankId));
    }

    @Transactional
    public void delete(long userId, long tankId) {
        if (!tanks.deleteByIdAndUserId(tankId, userId)) {
            throw new NotFoundException(NOT_FOUND);
        }
    }

    /**
     * The volume to store. With all three dimensions the server calculates it (the client's volume is
     * ignored); with none, the client's volume is used as given; a partial set is an error.
     */
    private BigDecimal resolveVolume(TankRequest request) {
        BigDecimal length = request.getLengthCm();
        BigDecimal width = request.getWidthCm();
        BigDecimal height = request.getHeightCm();
        int given = (length == null ? 0 : 1) + (width == null ? 0 : 1) + (height == null ? 0 : 1);

        if (given == 0) {
            return request.getVolumeLiters();
        }
        if (given < 3) {
            Map<String, String> missing = new LinkedHashMap<>();
            if (length == null) missing.put("lengthCm", "must be given together with width and height");
            if (width == null) missing.put("widthCm", "must be given together with length and height");
            if (height == null) missing.put("heightCm", "must be given together with length and width");
            throw new ValidationException(missing);
        }

        BigDecimal volume = TankVolumeCalculator.calculate(length, width, height);
        if (volume.compareTo(TankVolumeCalculator.MAX_VOLUME_LITERS) > 0) {
            throw new ValidationException(Map.of("volumeLiters", "must not be more than 10000 litres"));
        }
        if (volume.compareTo(TankVolumeCalculator.MIN_VOLUME_LITERS) < 0) {
            throw new ValidationException(Map.of("volumeLiters", "must be at least 0.1 litres"));
        }
        return volume;
    }

    private TankEntity load(long userId, long tankId) {
        return tanks.findByIdAndUserId(tankId, userId).orElseThrow(() -> new NotFoundException(NOT_FOUND));
    }

    private TankResponse toResponse(TankEntity tank) {
        return mapper.toResponse(tank, fish.findAllByTankId(tank.getId()));
    }

    /**
     * The request lists fish in display order (newest first) and fish are read back with the highest
     * id first, so they are stored in reverse: the first fish of the request gets the highest id.
     */
    private void saveFish(long tankId, TankRequest request, LocalDateTime now) {
        if (request.getFish() == null || request.getFish().isEmpty()) {
            return;
        }
        List<TankFishData> ordered = new ArrayList<>(request.getFish().stream().map(mapper::toFishData).toList());
        Collections.reverse(ordered);
        fish.insertAll(tankId, ordered, now);
    }
}
