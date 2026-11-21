package com.fishcaring.service;

import com.fishcaring.dto.UserResponse;
import com.fishcaring.entity.UserEntity;
import com.fishcaring.exception.UnauthorizedException;
import com.fishcaring.mapper.UserMapper;
import com.fishcaring.repository.UserRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository users;
    private final UserMapper userMapper;
    private final Clock clock;

    public UserService(UserRepository users, UserMapper userMapper, Clock clock) {
        this.users = users;
        this.userMapper = userMapper;
        this.clock = clock;
    }

    public UserResponse getMe(long userId) {
        return userMapper.toResponse(load(userId));
    }

    @Transactional
    public UserResponse updateDisplayName(long userId, String displayName) {
        boolean updated = users.updateDisplayName(userId, displayName.trim(), LocalDateTime.now(clock));
        if (!updated) {
            throw UnauthorizedException.unauthorized();
        }
        return userMapper.toResponse(load(userId));
    }

    /** A valid token for a user that no longer exists is treated as not authenticated. */
    private UserEntity load(long userId) {
        return users.findById(userId).orElseThrow(UnauthorizedException::unauthorized);
    }
}
