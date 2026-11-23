package com.fishcaring.config;

import com.fishcaring.service.VapidKeys;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Custom settings under the {@code app} prefix in application.yml. */
@ConfigurationProperties("app")
public record AppProperties(String corsAllowedOrigin, Jwt jwt, Vapid vapid) {

    private static final int MIN_SECRET_BYTES = 32;

    public AppProperties {
        if (jwt == null) {
            throw new IllegalStateException("Missing app.jwt settings. Set the JWT_SECRET environment variable.");
        }
        // no VAPID settings at all means Web Push is off
        if (vapid != null && vapid.isEmpty()) {
            vapid = null;
        }
    }

    /** The VAPID keys when Web Push is configured, empty when it is off. */
    public Optional<VapidKeys> vapidKeys() {
        return vapid == null ? Optional.empty() : Optional.of(VapidKeys.parse(vapid.publicKey(), vapid.privateKey()));
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

    /**
     * Web Push (VAPID) settings: all three or none. The keys are checked when the application starts,
     * so a wrong key stops it instead of failing later when a notification is sent.
     */
    public record Vapid(String publicKey, String privateKey, String subject) {

        public Vapid {
            boolean noKey = isBlank(publicKey) && isBlank(privateKey) && isBlank(subject);
            if (!noKey) {
                if (isBlank(publicKey) || isBlank(privateKey) || isBlank(subject)) {
                    throw new IllegalStateException(
                            "Web Push needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT together.");
                }
                if (!subject.startsWith("mailto:") && !subject.startsWith("https://")) {
                    throw new IllegalStateException("VAPID_SUBJECT must start with mailto: or https://");
                }
                VapidKeys.parse(publicKey, privateKey);
            }
        }

        boolean isEmpty() {
            return isBlank(publicKey) && isBlank(privateKey) && isBlank(subject);
        }

        private static boolean isBlank(String value) {
            return value == null || value.isBlank();
        }
    }
}
