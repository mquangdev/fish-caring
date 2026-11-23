package com.fishcaring.service;

import com.fishcaring.config.AppProperties;
import com.fishcaring.dto.PushSubscribeRequest;
import com.fishcaring.entity.PushSubscriptionEntity;
import com.fishcaring.exception.NotFoundException;
import com.fishcaring.exception.ValidationException;
import com.fishcaring.repository.PushSubscriptionRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Web Push subscriptions of the devices of a user. A device (endpoint) belongs to one user at a time:
 * subscribing again from the same device replaces the keys and moves it to the current user.
 */
@Service
public class PushSubscriptionService {

    private static final int USER_AGENT_MAX = 255;
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final PushSubscriptionRepository subscriptions;
    private final PushEndpointValidator validator;
    private final AppProperties properties;
    private final Clock clock;

    public PushSubscriptionService(PushSubscriptionRepository subscriptions, PushEndpointValidator validator,
                                   AppProperties properties, Clock clock) {
        this.subscriptions = subscriptions;
        this.validator = validator;
        this.properties = properties;
        this.clock = clock;
    }

    /** The VAPID public key, or 404 when Web Push is not configured. */
    public String publicKey() {
        return properties.vapidKeys().map(VapidKeys::publicKeyBase64Url)
                .orElseThrow(() -> new NotFoundException("Web Push is not configured"));
    }

    @Transactional
    public void subscribe(long userId, PushSubscribeRequest request, String userAgent) {
        validate(request);
        LocalDateTime now = LocalDateTime.now(clock);
        String agent = userAgent == null ? null : userAgent.substring(0, Math.min(USER_AGENT_MAX, userAgent.length()));
        Optional<PushSubscriptionEntity> existing = subscriptions.findByEndpoint(request.getEndpoint());
        if (existing.isPresent()) {
            subscriptions.updateByEndpoint(request.getEndpoint(), userId, request.getKeys().getP256dh(),
                    request.getKeys().getAuth(), agent, now);
        } else {
            subscriptions.insert(userId, request.getEndpoint(), request.getKeys().getP256dh(),
                    request.getKeys().getAuth(), agent, now);
        }
    }

    /** Removes the device of this user; someone else's device or an unknown endpoint is left alone. */
    @Transactional
    public void unsubscribe(long userId, String endpoint) {
        subscriptions.deleteByEndpointAndUserId(endpoint, userId);
    }

    private void validate(PushSubscribeRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        validator.problem(request.getEndpoint()).ifPresent(problem -> errors.put("endpoint", problem));
        try {
            EcKeys.publicKey(DECODER.decode(request.getKeys().getP256dh()));
        } catch (IllegalArgumentException e) {
            errors.put("keys.p256dh", "must be a base64url P-256 public key of 65 bytes");
        }
        try {
            if (DECODER.decode(request.getKeys().getAuth()).length != WebPushEncryption.AUTH_SECRET_BYTES) {
                errors.put("keys.auth", "must be 16 bytes in base64url");
            }
        } catch (IllegalArgumentException e) {
            errors.put("keys.auth", "must be 16 bytes in base64url");
        }
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }
}
