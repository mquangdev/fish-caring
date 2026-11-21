package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fishcaring.dto.AuthResponse;
import com.fishcaring.dto.LoginRequest;
import com.fishcaring.dto.RegisterRequest;
import com.fishcaring.entity.UserEntity;
import com.fishcaring.exception.ConflictException;
import com.fishcaring.exception.UnauthorizedException;
import com.fishcaring.mapper.UserMapper;
import com.fishcaring.repository.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-21T01:00:00Z"), ZoneOffset.UTC);

    @Mock
    private UserRepository users;
    @Mock
    private JwtService jwtService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(users, passwordEncoder, jwtService, new UserMapper(), CLOCK);
        when(jwtService.issueToken(anyLong())).thenReturn("signed-token");
    }

    private UserEntity user(long id, String email, String rawPassword) {
        LocalDateTime now = LocalDateTime.of(2026, 11, 21, 8, 0);
        return new UserEntity(id, email, passwordEncoder.encode(rawPassword), "Alice", now, now);
    }

    @Test
    void registerHashesPasswordNormalizesEmailAndReturnsToken() {
        when(users.existsByEmail("alice@example.com")).thenReturn(false);
        when(users.insert(anyString(), anyString(), anyString(), any())).thenReturn(7L);
        when(users.findById(7L)).thenReturn(Optional.of(user(7L, "alice@example.com", "secret-pass")));

        AuthResponse response = service.register(
                new RegisterRequest("  Alice@Example.COM ", "secret-pass", "  Alice  "));

        ArgumentCaptor<String> hash = ArgumentCaptor.forClass(String.class);
        verify(users).insert(eq("alice@example.com"), hash.capture(), eq("Alice"), any(LocalDateTime.class));
        assertThat(hash.getValue()).isNotEqualTo("secret-pass");
        assertThat(passwordEncoder.matches("secret-pass", hash.getValue())).isTrue();
        assertThat(response.getToken()).isEqualTo("signed-token");
        assertThat(response.getUser().getEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void registerUsesTheClockForTimestamps() {
        when(users.insert(anyString(), anyString(), anyString(), any())).thenReturn(7L);
        when(users.findById(7L)).thenReturn(Optional.of(user(7L, "a@example.com", "secret-pass")));

        service.register(new RegisterRequest("a@example.com", "secret-pass", "A"));

        verify(users).insert(anyString(), anyString(), anyString(), eq(LocalDateTime.of(2026, 11, 21, 1, 0)));
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(users.existsByEmail("alice@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.register(new RegisterRequest("ALICE@example.com", "secret-pass", "Alice")))
                .isInstanceOf(ConflictException.class);
        verify(users, never()).insert(anyString(), anyString(), anyString(), any());
    }

    @Test
    void registerMapsRaceOnUniqueEmailToConflict() {
        when(users.existsByEmail(anyString())).thenReturn(false);
        when(users.insert(anyString(), anyString(), anyString(), any())).thenThrow(new DuplicateKeyException("dup"));

        assertThatThrownBy(() -> service.register(new RegisterRequest("a@example.com", "secret-pass", "A")))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void loginSucceedsWithCorrectPassword() {
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(user(7L, "alice@example.com", "secret-pass")));

        AuthResponse response = service.login(new LoginRequest("Alice@Example.com", "secret-pass"));

        assertThat(response.getToken()).isEqualTo("signed-token");
        assertThat(response.getUser().getId()).isEqualTo(7L);
    }

    @Test
    void wrongPasswordAndUnknownEmailFailWithTheSameError() {
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(user(7L, "alice@example.com", "secret-pass")));
        when(users.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        UnauthorizedException wrongPassword = catchUnauthorized(new LoginRequest("alice@example.com", "bad-password"));
        UnauthorizedException unknownEmail = catchUnauthorized(new LoginRequest("nobody@example.com", "secret-pass"));

        assertThat(wrongPassword.getCode()).isEqualTo(UnauthorizedException.INVALID_CREDENTIALS);
        assertThat(unknownEmail.getCode()).isEqualTo(wrongPassword.getCode());
        assertThat(unknownEmail.getMessage()).isEqualTo(wrongPassword.getMessage());
    }

    private UnauthorizedException catchUnauthorized(LoginRequest request) {
        try {
            service.login(request);
        } catch (UnauthorizedException e) {
            return e;
        }
        throw new AssertionError("Expected UnauthorizedException");
    }
}
