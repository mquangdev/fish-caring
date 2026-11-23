package com.fishcaring.service;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/** Builds the VAPID {@code Authorization} header (RFC 8292): an ES256 JWT for the push service of an endpoint. */
public class VapidAuthorizer {

    /** A token may live 24 hours at most; 12 leaves room for clocks that are a little off. */
    static final Duration TOKEN_LIFETIME = Duration.ofHours(12);

    private final VapidKeys keys;
    private final String subject;

    public VapidAuthorizer(VapidKeys keys, String subject) {
        this.keys = keys;
        this.subject = subject;
    }

    /** {@code vapid t=<jwt>, k=<public key>} for the push service that owns {@code endpoint}. */
    public String authorization(String endpoint, Instant now) {
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .audience(origin(endpoint))
                    .expirationTime(Date.from(now.plus(TOKEN_LIFETIME)))
                    .subject(subject)
                    .build();
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.ES256), claims);
            jwt.sign(new ECDSASigner(keys.privateKey()));
            return "vapid t=" + jwt.serialize() + ", k=" + keys.publicKeyBase64Url();
        } catch (JOSEException e) {
            throw new IllegalStateException("Cannot sign the VAPID token", e);
        }
    }

    /** The origin of the push service: scheme, host and a non-default port. */
    static String origin(String endpoint) {
        URI uri = URI.create(endpoint);
        return uri.getScheme() + "://" + uri.getHost() + (uri.getPort() == -1 ? "" : ":" + uri.getPort());
    }
}
