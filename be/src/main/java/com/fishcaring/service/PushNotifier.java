package com.fishcaring.service;

import com.fishcaring.config.AppProperties;
import com.fishcaring.entity.PushSubscriptionEntity;
import com.fishcaring.object.PushMessage;
import com.fishcaring.repository.PushSubscriptionRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/**
 * Sends a notification as a Web Push message to every device of the user. Does nothing when Web Push
 * is not configured. Each device is handled on its own, so one failing device never stops the others.
 */
@Slf4j
@Service
public class PushNotifier {

    /** A device that is off for a while still gets the message when it is back within two hours. */
    static final int TTL_SECONDS = 2 * 60 * 60;
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final PushSubscriptionRepository subscriptions;
    private final PushGateway gateway;
    private final PushEndpointValidator validator;
    private final Optional<VapidAuthorizer> authorizer;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final Executor executor;

    public PushNotifier(PushSubscriptionRepository subscriptions, PushGateway gateway,
                        PushEndpointValidator validator, AppProperties properties, ObjectMapper objectMapper,
                        Clock clock, @Qualifier("pushExecutor") Executor executor) {
        this.subscriptions = subscriptions;
        this.gateway = gateway;
        this.validator = validator;
        this.authorizer = properties.vapidKeys()
                .map(keys -> new VapidAuthorizer(keys, properties.vapid().subject()));
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.executor = executor;
    }

    public boolean enabled() {
        return authorizer.isPresent();
    }

    public void notify(long userId, PushMessage message) {
        if (authorizer.isEmpty()) {
            return;
        }
        List<PushSubscriptionEntity> devices = subscriptions.findAllByUserId(userId);
        if (devices.isEmpty()) {
            return;
        }
        byte[] payload = payload(message);
        for (PushSubscriptionEntity device : devices) {
            executor.execute(() -> send(device, payload));
        }
    }

    private void send(PushSubscriptionEntity device, byte[] payload) {
        try {
            if (validator.problem(device.getEndpoint()).isPresent()) {
                // an endpoint that is not allowed should never have been stored; do not call it
                subscriptions.deleteByEndpoint(device.getEndpoint());
                return;
            }
            byte[] body = WebPushEncryption.encrypt(payload, DECODER.decode(device.getP256dh()),
                    DECODER.decode(device.getAuth()));
            String authorization = authorizer.orElseThrow().authorization(device.getEndpoint(), Instant.now(clock));
            int status = gateway.send(device.getEndpoint(), body, authorization, TTL_SECONDS);
            if (status == 404 || status == 410) {
                subscriptions.deleteByEndpoint(device.getEndpoint());
                log.info("Removed a push subscription that is gone (HTTP {})", status);
            } else if (status < 200 || status >= 300) {
                log.warn("The push service answered HTTP {}", status);
            }
        } catch (RuntimeException e) {
            // never log the endpoint or the keys
            log.warn("Sending a push message failed: {}", e.getClass().getSimpleName());
        }
    }

    private byte[] payload(PushMessage message) {
        Map<String, String> json = new LinkedHashMap<>();
        json.put("title", message.getTitle());
        json.put("body", message.getBody());
        json.put("url", message.getUrl());
        json.put("tag", message.getTag());
        return objectMapper.writeValueAsBytes(json);
    }
}
