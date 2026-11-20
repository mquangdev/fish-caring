package com.fishcaring.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fishcaring.RepositoryTestSupport;
import com.fishcaring.entity.PushSubscriptionEntity;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

class PushSubscriptionRepositoryTest extends RepositoryTestSupport {

    private static final String ENDPOINT = "https://push.example.com/send/abc123";

    @Test
    void insertAndFind() {
        long userId = newUser("a@example.com");

        pushSubscriptions.insert(userId, ENDPOINT, "p256dh-key", "auth-key", "Chrome", NOW);

        PushSubscriptionEntity row = pushSubscriptions.findByEndpoint(ENDPOINT).orElseThrow();
        assertThat(row.getUserId()).isEqualTo(userId);
        assertThat(row.getP256dh()).isEqualTo("p256dh-key");
        assertThat(row.getAuth()).isEqualTo("auth-key");
        assertThat(row.getCreatedAt()).isEqualTo(NOW);
        assertThat(pushSubscriptions.findAllByUserId(userId)).hasSize(1);
    }

    @Test
    void endpointIsUnique() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        pushSubscriptions.insert(alice, ENDPOINT, "k", "a", null, NOW);

        assertThatThrownBy(() -> pushSubscriptions.insert(bob, ENDPOINT, "k", "a", null, NOW))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void deleteOnlyRemovesTheOwnersSubscription() {
        long alice = newUser("a@example.com");
        long bob = newUser("b@example.com");
        pushSubscriptions.insert(alice, ENDPOINT, "k", "a", null, NOW);

        assertThat(pushSubscriptions.deleteByEndpointAndUserId(ENDPOINT, bob)).isFalse();
        assertThat(pushSubscriptions.findByEndpoint(ENDPOINT)).isPresent();

        assertThat(pushSubscriptions.deleteByEndpointAndUserId(ENDPOINT, alice)).isTrue();
        assertThat(pushSubscriptions.findByEndpoint(ENDPOINT)).isEmpty();
    }
}
