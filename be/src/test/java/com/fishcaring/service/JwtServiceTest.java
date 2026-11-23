package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fishcaring.config.AppProperties;
import com.fishcaring.config.JwtConfig;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-unit-test-secret-0123456789";

    private final AppProperties props = new AppProperties("http://localhost:5173", new AppProperties.Jwt(SECRET, 7), null);
    private final JwtConfig config = new JwtConfig();
    private final SecretKey key = config.jwtSecretKey(props);
    private final JwtEncoder encoder = config.jwtEncoder(key);
    private final JwtDecoder decoder = config.jwtDecoder(key);

    @Test
    void tokenCarriesUserIdAsSubjectAndExpiresAfterConfiguredDays() {
        Clock now = Clock.systemUTC();
        String token = new JwtService(encoder, now, props).issueToken(42L);

        Jwt jwt = decoder.decode(token);
        assertThat(jwt.getSubject()).isEqualTo("42");
        assertThat(jwt.getHeaders().get("alg")).isEqualTo("HS256");
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofDays(7));
    }

    @Test
    void tokenIssuedLongAgoIsExpired() {
        Clock longAgo = Clock.fixed(Instant.parse("2020-01-01T00:00:00Z"), ZoneOffset.UTC);
        String token = new JwtService(encoder, longAgo, props).issueToken(1L);

        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(BadJwtException.class);
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        SecretKey otherKey = new SecretKeySpec(
                "another-secret-another-secret-another-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        JwtEncoder otherEncoder = new NimbusJwtEncoder(new ImmutableSecret<>(otherKey));
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject("1").issuedAt(now).expiresAt(now.plus(Duration.ofDays(1))).build();
        String forged = otherEncoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        assertThatThrownBy(() -> decoder.decode(forged)).isInstanceOf(BadJwtException.class);
    }

    @Test
    void shortSecretIsRejectedAtStartup() {
        assertThatThrownBy(() -> new AppProperties.Jwt("too-short", 7))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void missingSecretIsRejectedAtStartup() {
        assertThatThrownBy(() -> new AppProperties.Jwt(null, 7)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new AppProperties.Jwt("  ", 7)).isInstanceOf(IllegalStateException.class);
    }
}
