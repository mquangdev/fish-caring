package com.fishcaring.config;

import java.nio.charset.StandardCharsets;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Custom settings under the {@code app} prefix in application.yml. */
@ConfigurationProperties("app")
public record AppProperties(String corsAllowedOrigin, Jwt jwt) {

    private static final int MIN_SECRET_BYTES = 32;

    public AppProperties {
        if (jwt == null) {
            throw new IllegalStateException("Missing app.jwt settings. Set the JWT_SECRET environment variable.");
        }
    }

    /** JWT settings. The secret must come from the environment and be at least 32 bytes (HS256). */
    public record Jwt(String secret, int expiresDays) {

        public Jwt {
            if (secret == null || secret.isBlank()) {
                throw new IllegalStateException(
                        "JWT_SECRET is not set. Provide a random secret of at least 32 characters.");
            }
            if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
                throw new IllegalStateException("JWT_SECRET is too short. Use at least 32 characters.");
            }
            if (expiresDays < 1) {
                throw new IllegalStateException("JWT_EXPIRES_DAYS must be at least 1.");
            }
        }
    }
}
