package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fishcaring.config.AppProperties;
import com.fishcaring.entity.PushSubscriptionEntity;
import com.fishcaring.object.PushMessage;
import com.fishcaring.repository.PushSubscriptionRepository;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import tools.jackson.databind.json.JsonMapper;

class PushNotifierTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-22T10:00:00Z"), ZoneOffset.UTC);
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 22, 10, 0);
    private static final long ALICE = 1L;
    private static final String FCM = "https://fcm.googleapis.com/fcm/send/alice-phone";
    private static final String MOZILLA = "https://updates.push.services.mozilla.com/wpush/v2/alice-laptop";

    private final PushSubscriptionRepository subscriptions = Mockito.mock(PushSubscriptionRepository.class);
    private final PushGateway gateway = Mockito.mock(PushGateway.class);
    private final PushEndpointValidator validator = new PushEndpointValidator(host -> {
        try {
            return List.of(InetAddress.getByAddress(new byte[] {(byte) 142, (byte) 250, 4, 95}));
        } catch (java.net.UnknownHostException e) {
            throw new IllegalStateException(e);
        }
    });
    private final KeyPair browser = EcKeys.generate();
    private final byte[] authSecret = new byte[16];
    private PushNotifier notifier;

    private final PushMessage message = PushMessage.builder()
            .title("Fish Caring").body("Bể 1: sắp đến giờ cho ăn (08:00)").url("/").tag("task-7").build();

    @BeforeEach
    void setUp() {
        Arrays.fill(authSecret, (byte) 9);
        notifier = notifier(vapid());
    }

    private AppProperties.Vapid vapid() {
        String[] pair = VapidKeys.generate();
        return new AppProperties.Vapid(pair[0], pair[1], "mailto:admin@example.com");
    }

    private PushNotifier notifier(AppProperties.Vapid vapid) {
        AppProperties properties = new AppProperties("http://localhost:5173", new AppProperties.Jwt("s".repeat(32), 7), vapid);
        return new PushNotifier(subscriptions, gateway, validator, properties, JsonMapper.builder().build(), CLOCK, Runnable::run);
    }

    private PushSubscriptionEntity device(long id, String endpoint) {
        String p256dh = B64.encodeToString(EcKeys.toUncompressed((ECPublicKey) browser.getPublic()));
        return new PushSubscriptionEntity(id, ALICE, endpoint, p256dh, B64.encodeToString(authSecret), "UA", NOW, NOW);
    }

    @Test
    void sendsTheMessageToEveryDeviceOfTheUser() {
        when(subscriptions.findAllByUserId(ALICE)).thenReturn(List.of(device(1, FCM), device(2, MOZILLA)));
        when(gateway.send(anyString(), any(), anyString(), anyInt())).thenReturn(201);

        notifier.notify(ALICE, message);

        verify(gateway).send(eq(FCM), any(), anyString(), eq(7200));
        verify(gateway).send(eq(MOZILLA), any(), anyString(), eq(7200));
    }

    @Test
    void theBodyIsEncryptedForTheDeviceAndHoldsTheTextOfTheNotification() throws Exception {
        when(subscriptions.findAllByUserId(ALICE)).thenReturn(List.of(device(1, FCM)));
        when(gateway.send(anyString(), any(), anyString(), anyInt())).thenReturn(201);

        notifier.notify(ALICE, message);

        ArgumentCaptor<byte[]> body = ArgumentCaptor.forClass(byte[].class);
        ArgumentCaptor<String> authorization = ArgumentCaptor.forClass(String.class);
        verify(gateway).send(eq(FCM), body.capture(), authorization.capture(), anyInt());
        assertThat(authorization.getValue()).startsWith("vapid t=").contains(", k=");
        String json = decrypt(body.getValue());
        assertThat(json).contains("\"title\":\"Fish Caring\"").contains("\"body\":\"Bể 1: sắp đến giờ cho ăn (08:00)\"")
                .contains("\"url\":\"/\"").contains("\"tag\":\"task-7\"");
    }

    @Test
    void aDeviceThatIsGoneIsRemovedWhenThePushServiceSays404Or410() {
        when(subscriptions.findAllByUserId(ALICE)).thenReturn(List.of(device(1, FCM), device(2, MOZILLA)));
        when(gateway.send(eq(FCM), any(), anyString(), anyInt())).thenReturn(410);
        when(gateway.send(eq(MOZILLA), any(), anyString(), anyInt())).thenReturn(404);

        notifier.notify(ALICE, message);

        verify(subscriptions).deleteByEndpoint(FCM);
        verify(subscriptions).deleteByEndpoint(MOZILLA);
    }

    @Test
    void otherFailuresKeepTheSubscriptionAndNeverStopTheOtherDevices() {
        when(subscriptions.findAllByUserId(ALICE)).thenReturn(List.of(device(1, FCM), device(2, MOZILLA)));
        when(gateway.send(eq(FCM), any(), anyString(), anyInt())).thenThrow(new IllegalStateException("down"));
        when(gateway.send(eq(MOZILLA), any(), anyString(), anyInt())).thenReturn(500);

        notifier.notify(ALICE, message);

        verify(gateway).send(eq(MOZILLA), any(), anyString(), anyInt());
        verify(subscriptions, never()).deleteByEndpoint(anyString());
    }

    @Test
    void aStoredEndpointThatIsNotAllowedIsDroppedAndNeverCalled() {
        when(subscriptions.findAllByUserId(ALICE)).thenReturn(List.of(device(1, "https://127.0.0.1/steal")));

        notifier.notify(ALICE, message);

        verify(gateway, never()).send(anyString(), any(), anyString(), anyInt());
        verify(subscriptions).deleteByEndpoint("https://127.0.0.1/steal");
    }

    @Test
    void doesNothingWhenWebPushIsNotConfigured() {
        PushNotifier off = notifier(null);

        off.notify(ALICE, message);

        assertThat(off.enabled()).isFalse();
        verify(subscriptions, never()).findAllByUserId(ALICE);
        verify(gateway, never()).send(anyString(), any(), anyString(), anyInt());
    }

    @Test
    void doesNothingForAUserWithoutDevices() {
        when(subscriptions.findAllByUserId(ALICE)).thenReturn(List.of());

        notifier.notify(ALICE, message);

        verify(gateway, never()).send(anyString(), any(), anyString(), anyInt());
    }

    @Test
    void onlyTheDevicesOfTheGivenUserAreAsked() {
        notifier.notify(99L, message);

        verify(subscriptions).findAllByUserId(99L);
        verify(subscriptions, never()).findAllByUserId(ALICE);
    }

    private String decrypt(byte[] body) throws Exception {
        byte[] salt = Arrays.copyOfRange(body, 0, 16);
        byte[] senderPublic = Arrays.copyOfRange(body, 21, 86);
        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init((ECPrivateKey) browser.getPrivate());
        agreement.doPhase(EcKeys.publicKey(senderPublic), true);
        byte[] prkKey = WebPushEncryption.hkdfExtract(authSecret, agreement.generateSecret());
        java.io.ByteArrayOutputStream info = new java.io.ByteArrayOutputStream();
        info.writeBytes("WebPush: info\0".getBytes(StandardCharsets.US_ASCII));
        info.writeBytes(EcKeys.toUncompressed((ECPublicKey) browser.getPublic()));
        info.writeBytes(senderPublic);
        byte[] prk = WebPushEncryption.hkdfExtract(salt, WebPushEncryption.hkdfExpand(prkKey, info.toByteArray(), 32));
        byte[] cek = WebPushEncryption.hkdfExpand(prk, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
        byte[] nonce = WebPushEncryption.hkdfExpand(prk, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
        byte[] padded = cipher.doFinal(Arrays.copyOfRange(body, 86, body.length));
        return new String(Arrays.copyOf(padded, padded.length - 1), StandardCharsets.UTF_8);
    }
}
