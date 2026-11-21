package com.fishcaring.service;

import com.fishcaring.dto.AuthResponse;
import com.fishcaring.dto.LoginRequest;
import com.fishcaring.dto.RegisterRequest;
import com.fishcaring.entity.UserEntity;
import com.fishcaring.exception.ConflictException;
import com.fishcaring.exception.UnauthorizedException;
import com.fishcaring.mapper.UserMapper;
import com.fishcaring.repository.UserRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final Clock clock;
    /** Compared against when the email is unknown, so both login failures take a similar time. */
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
                       UserMapper userMapper, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode("not-a-real-password");
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (users.existsByEmail(email)) {
            throw new ConflictException("Email is already registered");
        }
        long id;
        try {
            id = users.insert(email, passwordEncoder.encode(request.getPassword()),
                    request.getDisplayName().trim(), LocalDateTime.now(clock));
        } catch (DuplicateKeyException e) {
            // two requests registered the same email at the same time
            throw new ConflictException("Email is already registered");
        }
        UserEntity user = users.findById(id).orElseThrow();
        return new AuthResponse(jwtService.issueToken(id), userMapper.toResponse(user));
    }

    public AuthResponse login(LoginRequest request) {
        Optional<UserEntity> found = users.findByEmail(normalizeEmail(request.getEmail()));
        String hash = found.map(UserEntity::getPasswordHash).orElse(dummyHash);
        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), hash);
        if (found.isEmpty() || !passwordMatches) {
            throw UnauthorizedException.invalidCredentials();
        }
        UserEntity user = found.get();
        return new AuthResponse(jwtService.issueToken(user.getId()), userMapper.toResponse(user));
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
