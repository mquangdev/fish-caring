package com.fishcaring.service;

import com.fishcaring.config.AppProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** Issues signed access tokens. The subject is the user id; nothing else is put in the token. */
@Service
public class JwtService {

    private final JwtEncoder encoder;
    private final Clock clock;
    private final Duration lifetime;

    public JwtService(JwtEncoder encoder, Clock clock, AppProperties props) {
        this.encoder = encoder;
        this.clock = clock;
        this.lifetime = Duration.ofDays(props.jwt().expiresDays());
    }

    public String issueToken(long userId) {
        Instant issuedAt = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(String.valueOf(userId))
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plus(lifetime))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
