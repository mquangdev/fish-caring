package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.security.interfaces.ECPublicKey;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class VapidAuthorizerTest {

    private static final Instant NOW = Instant.parse("2026-11-22T10:00:00Z");
    private static final String SUBJECT = "mailto:admin@example.com";

    private final String[] pair = VapidKeys.generate();
    private final VapidKeys keys = VapidKeys.parse(pair[0], pair[1]);
    private final VapidAuthorizer authorizer = new VapidAuthorizer(keys, SUBJECT);

    private SignedJWT token(String header) throws Exception {
        String t = header.substring(header.indexOf("t=") + 2, header.indexOf(", k="));
        return SignedJWT.parse(t);
    }

    @Test
    void theHeaderCarriesTheTokenAndThePublicKey() {
        String header = authorizer.authorization("https://fcm.googleapis.com/fcm/send/abc", NOW);

        assertThat(header).startsWith("vapid t=").endsWith(", k=" + pair[0]);
    }

    @Test
    void theTokenIsEs256WithTheAudienceTheSubjectAndAnExpiryWithin24Hours() throws Exception {
        SignedJWT jwt = token(authorizer.authorization("https://fcm.googleapis.com/fcm/send/abc", NOW));

        JWTClaimsSet claims = jwt.getJWTClaimsSet();
        assertThat(jwt.getHeader().getAlgorithm().getName()).isEqualTo("ES256");
        assertThat(claims.getAudience()).containsExactly("https://fcm.googleapis.com");
        assertThat(claims.getSubject()).isEqualTo(SUBJECT);
        Duration lifetime = Duration.between(NOW, claims.getExpirationTime().toInstant());
        assertThat(lifetime).isPositive().isLessThanOrEqualTo(Duration.ofHours(24));
    }

    @Test
    void theSignatureVerifiesWithThePublicKeyAndNotWithAnother() throws Exception {
        SignedJWT jwt = token(authorizer.authorization("https://updates.push.services.mozilla.com/wpush/v2/x", NOW));

        ECPublicKey mine = EcKeys.publicKey(keys.publicKeyBytes());
        ECPublicKey other = (ECPublicKey) EcKeys.generate().getPublic();
        assertThat(jwt.verify(new ECDSAVerifier(mine))).isTrue();
        assertThat(jwt.verify(new ECDSAVerifier(other))).isFalse();
    }

    @Test
    void theAudienceKeepsAnExplicitPortButNotThePath() {
        assertThat(VapidAuthorizer.origin("https://push.example.com:8443/a/b?c=d")).isEqualTo("https://push.example.com:8443");
        assertThat(VapidAuthorizer.origin("https://push.example.com/a")).isEqualTo("https://push.example.com");
    }

    @Test
    void keysThatDoNotBelongTogetherOrAreMalformedAreRejected() {
        String[] other = VapidKeys.generate();

        assertThatThrownBy(() -> VapidKeys.parse(pair[0], other[1])).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> VapidKeys.parse("not-a-key", pair[1])).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> VapidKeys.parse(pair[0], "AAAA")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void generatedKeysAreTheRightSizeAndThePrivateKeyIsNeverPrinted() {
        assertThat(java.util.Base64.getUrlDecoder().decode(pair[0])).hasSize(65);
        assertThat(java.util.Base64.getUrlDecoder().decode(pair[1])).hasSize(32);
        assertThat(keys.toString()).doesNotContain(pair[1]);
    }
}
