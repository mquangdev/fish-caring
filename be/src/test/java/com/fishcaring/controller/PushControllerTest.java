package com.fishcaring.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fishcaring.service.EcKeys;
import com.fishcaring.service.NotificationService;
import com.fishcaring.service.PushEndpointValidator;
import com.fishcaring.service.PushGateway;
import com.fishcaring.service.VapidKeys;
import com.jayway.jsonpath.JsonPath;
import java.net.InetAddress;
import java.security.interfaces.ECPublicKey;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * Full stack for /api/push with Web Push configured. The push service is a mock gateway and DNS is
 * faked, so no network is used. The scheduler is off; notifications are created by calling the service.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(PushControllerTest.PublicHosts.class)
class PushControllerTest {

    private static final String[] KEYS = VapidKeys.generate();
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String PHONE = "https://fcm.googleapis.com/fcm/send/alice-phone";

    /** Every host resolves to a public address, except those named "internal.*" which resolve to 10.0.0.1. */
    @TestConfiguration
    static class PublicHosts {

        @Bean
        @Primary
        PushEndpointValidator pushEndpointValidator() {
            return new PushEndpointValidator(host -> {
                try {
                    byte[] address = host.startsWith("internal.") ? new byte[] {10, 0, 0, 1} : new byte[] {(byte) 142, (byte) 250, 4, 95};
                    return List.of(InetAddress.getByAddress(address));
                } catch (java.net.UnknownHostException e) {
                    throw new IllegalStateException(e);
                }
            });
        }
    }

    @DynamicPropertySource
    static void vapid(DynamicPropertyRegistry registry) {
        registry.add("app.vapid.public-key", () -> KEYS[0]);
        registry.add("app.vapid.private-key", () -> KEYS[1]);
        registry.add("app.vapid.subject", () -> "mailto:admin@example.com");
    }

    @MockitoBean
    private PushGateway gateway;

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcClient jdbc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private NotificationService notificationService;

    private String alice;
    private String bob;

    @BeforeEach
    void setUp() throws Exception {
        alice = register("alice@example.com", "Alice");
        bob = register("bob@example.com", "Bob");
    }

    // ---- helpers ----

    private String register(String email, String name) throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("email", email, "password", "secret-pass", "displayName", name));
        String response = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.token");
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String token, Object body) throws Exception {
        var builder = request.header("Authorization", "Bearer " + token);
        if (body != null) {
            builder = builder.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        return mvc.perform(builder);
    }

    private static Map<String, Object> subscription(String endpoint) {
        Map<String, Object> keys = new LinkedHashMap<>();
        keys.put("p256dh", B64.encodeToString(EcKeys.toUncompressed((ECPublicKey) EcKeys.generate().getPublic())));
        keys.put("auth", B64.encodeToString(new byte[16]));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("endpoint", endpoint);
        body.put("keys", keys);
        return body;
    }

    private int subscriptions() {
        return jdbc.sql("SELECT COUNT(*) FROM push_subscriptions").query(Integer.class).single();
    }

    private String ownerOf(String endpoint) {
        return jdbc.sql("SELECT u.email FROM push_subscriptions p JOIN users u ON u.id = p.user_id WHERE p.endpoint = :e")
                .param("e", endpoint).query(String.class).single();
    }

    // ---- authentication ----

    @Test
    void everyRouteNeedsAToken() throws Exception {
        mvc.perform(get("/api/push/public-key")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/push/subscribe").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/push/subscribe").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    // ---- public key ----

    @Test
    void thePublicKeyIsTheConfiguredOne() throws Exception {
        send(get("/api/push/public-key"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicKey").value(KEYS[0]));
    }

    // ---- subscribe ----

    @Test
    void subscribingStoresTheDeviceWithItsUserAgent() throws Exception {
        send(post("/api/push/subscribe").header("User-Agent", "Mozilla/5.0 Test"), alice, subscription(PHONE))
                .andExpect(status().isNoContent());

        assertThat(subscriptions()).isEqualTo(1);
        assertThat(ownerOf(PHONE)).isEqualTo("alice@example.com");
        assertThat(jdbc.sql("SELECT user_agent FROM push_subscriptions").query(String.class).single())
                .isEqualTo("Mozilla/5.0 Test");
    }

    @Test
    void subscribingAgainFromTheSameDeviceKeepsOneRowWithTheNewKeys() throws Exception {
        send(post("/api/push/subscribe"), alice, subscription(PHONE)).andExpect(status().isNoContent());
        Map<String, Object> again = subscription(PHONE);

        send(post("/api/push/subscribe"), alice, again).andExpect(status().isNoContent());

        assertThat(subscriptions()).isEqualTo(1);
        @SuppressWarnings("unchecked")
        Map<String, Object> keys = (Map<String, Object>) again.get("keys");
        assertThat(jdbc.sql("SELECT p256dh FROM push_subscriptions").query(String.class).single())
                .isEqualTo(keys.get("p256dh"));
    }

    @Test
    void anotherUserLoggingInOnTheSameDeviceTakesTheDeviceOver() throws Exception {
        send(post("/api/push/subscribe"), alice, subscription(PHONE)).andExpect(status().isNoContent());

        send(post("/api/push/subscribe"), bob, subscription(PHONE)).andExpect(status().isNoContent());

        assertThat(subscriptions()).isEqualTo(1);
        assertThat(ownerOf(PHONE)).isEqualTo("bob@example.com");
    }

    @Test
    void invalidSubscriptionsAreRejectedWithFieldErrors() throws Exception {
        send(post("/api/push/subscribe"), alice, subscription("http://fcm.googleapis.com/x"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.endpoint").exists());
        send(post("/api/push/subscribe"), alice, subscription("https://internal.example.com/x"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.endpoint").exists());
        send(post("/api/push/subscribe"), alice, subscription("https://127.0.0.1/x"))
                .andExpect(status().isBadRequest());

        Map<String, Object> badKeys = subscription(PHONE);
        badKeys.put("keys", Map.of("p256dh", B64.encodeToString(new byte[10]), "auth", B64.encodeToString(new byte[15])));
        send(post("/api/push/subscribe"), alice, badKeys)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors['keys.p256dh']").exists())
                .andExpect(jsonPath("$.fieldErrors['keys.auth']").exists());

        send(post("/api/push/subscribe"), alice, Map.of("endpoint", PHONE)).andExpect(status().isBadRequest());
        send(post("/api/push/subscribe"), alice, Map.of()).andExpect(status().isBadRequest());
        assertThat(subscriptions()).isZero();
    }

    // ---- unsubscribe ----

    @Test
    void unsubscribingRemovesTheDeviceAndRepeatingItIsFine() throws Exception {
        send(post("/api/push/subscribe"), alice, subscription(PHONE)).andExpect(status().isNoContent());

        send(delete("/api/push/subscribe"), alice, Map.of("endpoint", PHONE)).andExpect(status().isNoContent());
        send(delete("/api/push/subscribe"), alice, Map.of("endpoint", PHONE)).andExpect(status().isNoContent());

        assertThat(subscriptions()).isZero();
    }

    @Test
    void anotherUserCannotRemoveMyDeviceAndMyPushStillArrives() throws Exception {
        send(post("/api/push/subscribe"), alice, subscription(PHONE)).andExpect(status().isNoContent());

        send(delete("/api/push/subscribe"), bob, Map.of("endpoint", PHONE)).andExpect(status().isNoContent());

        assertThat(subscriptions()).isEqualTo(1);
        assertThat(ownerOf(PHONE)).isEqualTo("alice@example.com");
    }

    // ---- sending ----

    private long dueTask(String token, String title, int minutes) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "FEED");
        body.put("title", title);
        body.put("repeatType", "DAILY");
        body.put("timeOfDay", "08:00");
        String response = send(post("/api/tasks"), token, body)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(response, "$.id")).longValue();
        jdbc.sql("UPDATE care_tasks SET next_due_at = :d WHERE id = :id")
                .param("d", java.sql.Timestamp.valueOf(LocalDateTime.now(VIETNAM).withNano(0).plusMinutes(minutes)))
                .param("id", id).update();
        return id;
    }

    @Test
    void aNewNotificationIsPushedToTheDevicesOfItsUserOnly() throws Exception {
        send(post("/api/push/subscribe"), alice, subscription(PHONE)).andExpect(status().isNoContent());
        String bobsPhone = "https://fcm.googleapis.com/fcm/send/bob-phone";
        send(post("/api/push/subscribe"), bob, subscription(bobsPhone)).andExpect(status().isNoContent());
        org.mockito.Mockito.when(gateway.send(anyString(), org.mockito.ArgumentMatchers.any(), anyString(), anyInt()))
                .thenReturn(201);
        dueTask(alice, "Cho ăn", 10);

        notificationService.createDueNotifications();

        verify(gateway, timeout(3000)).send(eq(PHONE), org.mockito.ArgumentMatchers.any(byte[].class),
                org.mockito.ArgumentMatchers.startsWith("vapid t="), eq(7200));
        verify(gateway, after(300).never()).send(eq(bobsPhone), org.mockito.ArgumentMatchers.any(), anyString(), anyInt());
    }

    @Test
    void nothingIsSentToAUserWhoHasNoDevice() throws Exception {
        dueTask(alice, "Cho ăn", 10);

        notificationService.createDueNotifications();

        verify(gateway, after(300).never()).send(anyString(), org.mockito.ArgumentMatchers.any(), anyString(), anyInt());
        verify(gateway, never()).send(eq(PHONE), org.mockito.ArgumentMatchers.any(), anyString(), anyInt());
    }
}
