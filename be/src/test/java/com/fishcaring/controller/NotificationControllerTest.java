package com.fishcaring.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fishcaring.service.NotificationService;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * Full stack for the notifications on H2 with the real migrations. The scheduler is off in tests;
 * {@code createDueNotifications()} is called directly. The JWT uses the system clock, so due times
 * are built relative to now in Vietnam time.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationControllerTest {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

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
    private long aliceTank;

    @BeforeEach
    void setUp() throws Exception {
        alice = register("alice@example.com", "Alice");
        bob = register("bob@example.com", "Bob");
        String response = send(post("/api/tanks"), alice, Map.of("name", "Bể Mini 30L"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        aliceTank = ((Number) JsonPath.read(response, "$.id")).longValue();
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

    private long createTask(String token, Long tankId, String title) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("tankId", tankId);
        body.put("type", "FEED");
        body.put("title", title);
        body.put("repeatType", "DAILY");
        body.put("timeOfDay", "08:00");
        String response = send(post("/api/tasks"), token, body)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(response, "$.id")).longValue();
    }

    private void dueAt(long taskId, LocalDateTime due) {
        jdbc.sql("UPDATE care_tasks SET next_due_at = :due WHERE id = :id")
                .param("due", java.sql.Timestamp.valueOf(due)).param("id", taskId).update();
    }

    private LocalDateTime inMinutes(long minutes) {
        return LocalDateTime.now(VIETNAM).withNano(0).plusMinutes(minutes);
    }

    private int count(String sql) {
        return jdbc.sql(sql).query(Integer.class).single();
    }

    // ---- authentication ----

    @Test
    void everyRouteNeedsAToken() throws Exception {
        mvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/notifications/unread-count")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/notifications/read-all")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/notifications/1/read")).andExpect(status().isUnauthorized());
    }

    // ---- list, count, read ----

    @Test
    void aTaskThatIsDueSoonProducesOneUnreadNotificationInTheList() throws Exception {
        long task = createTask(alice, aliceTank, "Cho ăn");
        dueAt(task, inMinutes(20));

        notificationService.createDueNotifications();
        notificationService.createDueNotifications();

        send(get("/api/notifications"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].taskId").value(task))
                .andExpect(jsonPath("$[0].status").value("UNREAD"))
                .andExpect(jsonPath("$[0].message").value(org.hamcrest.Matchers.startsWith("Bể Mini 30L: sắp đến giờ cho ăn (")))
                .andExpect(jsonPath("$[0].dueAt").exists())
                .andExpect(jsonPath("$[0].createdAt").exists());
        send(get("/api/notifications/unread-count"), alice, null).andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void aTaskThatIsNotCloseToDueProducesNothing() throws Exception {
        dueAt(createTask(alice, aliceTank, "Cho ăn"), inMinutes(90));

        notificationService.createDueNotifications();

        send(get("/api/notifications"), alice, null).andExpect(jsonPath("$", hasSize(0)));
        send(get("/api/notifications/unread-count"), alice, null).andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void aTaskWithoutATankIsNamedViecChung() throws Exception {
        dueAt(createTask(alice, null, "Thay nước trùn chỉ"), inMinutes(-5));

        notificationService.createDueNotifications();

        send(get("/api/notifications"), alice, null)
                .andExpect(jsonPath("$[0].message").value("Việc chung: đến giờ thay nước trùn chỉ"));
    }

    @Test
    void markingOneReadDropsTheCountAndReadAllReadsTheRest() throws Exception {
        dueAt(createTask(alice, aliceTank, "Cho ăn"), inMinutes(10));
        dueAt(createTask(alice, null, "Thay nước"), inMinutes(10));
        notificationService.createDueNotifications();
        String list = send(get("/api/notifications"), alice, null).andReturn().getResponse().getContentAsString();
        long first = ((Number) JsonPath.read(list, "$[0].id")).longValue();

        send(post("/api/notifications/" + first + "/read"), alice, null).andExpect(status().isNoContent());
        send(get("/api/notifications/unread-count"), alice, null).andExpect(jsonPath("$.count").value(1));

        send(post("/api/notifications/read-all"), alice, null).andExpect(status().isNoContent());
        send(get("/api/notifications/unread-count"), alice, null).andExpect(jsonPath("$.count").value(0));
        send(get("/api/notifications"), alice, null)
                .andExpect(jsonPath("$[0].status").value("READ"))
                .andExpect(jsonPath("$[1].status").value("READ"));
    }

    @Test
    void theListRespectsTheLimit() throws Exception {
        dueAt(createTask(alice, aliceTank, "Một"), inMinutes(10));
        dueAt(createTask(alice, aliceTank, "Hai"), inMinutes(11));
        notificationService.createDueNotifications();

        send(get("/api/notifications?limit=1"), alice, null).andExpect(jsonPath("$", hasSize(1)));
        send(get("/api/notifications?limit=0"), alice, null).andExpect(jsonPath("$", hasSize(1)));
        send(get("/api/notifications?limit=500"), alice, null).andExpect(jsonPath("$", hasSize(2)));
    }

    // ---- resolve ----

    @Test
    void snoozingResolvesTheNotificationAndTomorrowGivesANewOne() throws Exception {
        long task = createTask(alice, aliceTank, "Cho ăn");
        dueAt(task, inMinutes(10));
        notificationService.createDueNotifications();

        send(post("/api/tasks/" + task + "/snooze"), alice, null).andExpect(status().isOk());

        send(get("/api/notifications"), alice, null).andExpect(jsonPath("$[0].status").value("RESOLVED"));
        send(get("/api/notifications/unread-count"), alice, null).andExpect(jsonPath("$.count").value(0));
        notificationService.createDueNotifications();
        send(get("/api/notifications"), alice, null).andExpect(jsonPath("$", hasSize(1)));

        // tomorrow: the new due time is within 30 minutes
        dueAt(task, inMinutes(25));
        notificationService.createDueNotifications();
        send(get("/api/notifications"), alice, null)
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].status").value("UNREAD"));
    }

    @Test
    void completingResolvesTheNotification() throws Exception {
        long task = createTask(alice, aliceTank, "Cho ăn");
        dueAt(task, inMinutes(10));
        notificationService.createDueNotifications();

        send(post("/api/tasks/" + task + "/complete"), alice, null).andExpect(status().isOk());

        send(get("/api/notifications"), alice, null).andExpect(jsonPath("$[0].status").value("RESOLVED"));
    }

    @Test
    void turningTheTaskOffOrChangingItsTimeResolvesTheNotificationButEditingTheTitleDoesNot() throws Exception {
        long task = createTask(alice, aliceTank, "Cho ăn");
        dueAt(task, inMinutes(10));
        notificationService.createDueNotifications();

        Map<String, Object> sameTime = new LinkedHashMap<>();
        sameTime.put("tankId", aliceTank);
        sameTime.put("type", "FEED");
        sameTime.put("title", "Cho ăn mới");
        sameTime.put("repeatType", "DAILY");
        sameTime.put("timeOfDay", "08:00");
        send(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/tasks/" + task), alice, sameTime)
                .andExpect(status().isOk());
        send(get("/api/notifications"), alice, null).andExpect(jsonPath("$[0].status").value("UNREAD"));

        sameTime.put("timeOfDay", "18:00");
        send(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/tasks/" + task), alice, sameTime)
                .andExpect(status().isOk());
        send(get("/api/notifications"), alice, null).andExpect(jsonPath("$[0].status").value("RESOLVED"));

        dueAt(task, inMinutes(10));
        notificationService.createDueNotifications();
        send(patch("/api/tasks/" + task + "/enabled"), alice, Map.of("enabled", false)).andExpect(status().isOk());
        send(get("/api/notifications"), alice, null).andExpect(jsonPath("$[0].status").value("RESOLVED"));
    }

    @Test
    void aTurnedOffTaskGetsNoNotification() throws Exception {
        long task = createTask(alice, aliceTank, "Cho ăn");
        send(patch("/api/tasks/" + task + "/enabled"), alice, Map.of("enabled", false)).andExpect(status().isOk());
        dueAt(task, inMinutes(5));

        notificationService.createDueNotifications();

        send(get("/api/notifications"), alice, null).andExpect(jsonPath("$", hasSize(0)));
    }

    // ---- isolation between users ----

    @Test
    void anotherUserSeesCountsAndChangesNothingOfAlice() throws Exception {
        long task = createTask(alice, aliceTank, "Cho ăn");
        dueAt(task, inMinutes(10));
        notificationService.createDueNotifications();
        String list = send(get("/api/notifications"), alice, null).andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(list, "$[0].id")).longValue();

        send(get("/api/notifications"), bob, null).andExpect(jsonPath("$", hasSize(0)));
        send(get("/api/notifications/unread-count"), bob, null).andExpect(jsonPath("$.count").value(0));
        send(post("/api/notifications/" + id + "/read"), bob, null).andExpect(status().isNotFound());
        send(post("/api/notifications/read-all"), bob, null).andExpect(status().isNoContent());

        assertThat(count("SELECT COUNT(*) FROM notifications WHERE status = 'UNREAD'")).isEqualTo(1);
        send(get("/api/notifications/unread-count"), alice, null).andExpect(jsonPath("$.count").value(1));
    }
}
