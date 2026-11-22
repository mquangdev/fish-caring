package com.fishcaring.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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
 * Full stack for complete, snooze, the "today" screen and the care history on H2 with the real
 * migrations. The JWT uses the system clock, so times are built relative to now in Vietnam time;
 * the exact schedule maths is in {@code ScheduleCalculatorTest} and {@code CareTaskServiceTest}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CareActionControllerTest {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcClient jdbc;
    @Autowired
    private ObjectMapper objectMapper;

    private String alice;
    private String bob;
    private long aliceTank;

    @BeforeEach
    void setUp() throws Exception {
        alice = register("alice@example.com", "Alice");
        bob = register("bob@example.com", "Bob");
        String response = send(post("/api/tanks"), alice, Map.of("name", "Be cua Alice"))
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

    private long createTask(String token, Long tankId, String title, String repeat, String time) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("tankId", tankId);
        body.put("type", "FEED");
        body.put("title", title);
        body.put("repeatType", repeat);
        body.put("timeOfDay", time);
        if ("ONCE".equals(repeat)) {
            body.put("startDate", LocalDate.now(VIETNAM).plusDays(2).toString());
        }
        String response = send(post("/api/tasks"), token, body)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(response, "$.id")).longValue();
    }

    /** Puts the due time of a task where the test needs it. */
    private void dueAt(long taskId, LocalDateTime due) {
        jdbc.sql("UPDATE care_tasks SET next_due_at = :due WHERE id = :id")
                .param("due", java.sql.Timestamp.valueOf(due)).param("id", taskId).update();
    }

    private int count(String sql) {
        return jdbc.sql(sql).query(Integer.class).single();
    }

    // ---- authentication ----

    @Test
    void everyRouteNeedsAToken() throws Exception {
        mvc.perform(post("/api/tasks/1/complete")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/tasks/1/snooze")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/today")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/tanks/1/logs")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/tasks/general/logs")).andExpect(status().isUnauthorized());
    }

    // ---- complete ----

    @Test
    void completingADailyTaskMovesItToTomorrowAndWritesOneLog() throws Exception {
        long id = createTask(alice, aliceTank, "Cho an", "DAILY", "08:00");
        LocalDateTime due = LocalDateTime.now(VIETNAM).minusHours(1).withNano(0);
        dueAt(id, due);

        send(post("/api/tasks/" + id + "/complete"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.nextDueAt").value(LocalDate.now(VIETNAM).plusDays(1) + "T08:00:00"));

        send(get("/api/tanks/" + aliceTank + "/logs"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].taskTitle").value("Cho an"))
                .andExpect(jsonPath("$[0].result").value("DONE"))
                .andExpect(jsonPath("$[0].tankId").value(aliceTank))
                .andExpect(jsonPath("$[0].taskId").value(id))
                .andExpect(jsonPath("$[0].dueAt").value(ISO.format(due)));
    }

    @Test
    void completingAOneOffTaskTurnsItOff() throws Exception {
        long id = createTask(alice, aliceTank, "Mot lan", "ONCE", "09:00");
        dueAt(id, LocalDateTime.now(VIETNAM).minusMinutes(5).withNano(0));

        send(post("/api/tasks/" + id + "/complete"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.nextDueAt").doesNotExist());
    }

    // ---- snooze ----

    @Test
    void snoozingMovesTheDueTimeOneDayLaterAndLogsIt() throws Exception {
        long id = createTask(alice, aliceTank, "Cho an", "DAILY", "08:00");
        LocalDateTime due = LocalDate.now(VIETNAM).atTime(0, 5);
        dueAt(id, due);

        // the new time is the old one plus a day when that is still in the future, otherwise tomorrow at 08:00
        send(post("/api/tasks/" + id + "/snooze"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.nextDueAt").value(ISO.format(due.plusDays(1))));

        send(get("/api/tanks/" + aliceTank + "/logs"), alice, null)
                .andExpect(jsonPath("$[0].result").value("SNOOZED"));
    }

    @Test
    void aTurnedOffTaskCannotBeCompletedOrSnoozed() throws Exception {
        long id = createTask(alice, aliceTank, "Cho an", "DAILY", "08:00");
        send(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/tasks/" + id + "/enabled"),
                alice, Map.of("enabled", false)).andExpect(status().isOk());

        send(post("/api/tasks/" + id + "/complete"), alice, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
        send(post("/api/tasks/" + id + "/snooze"), alice, null).andExpect(status().isConflict());
        assertThat(count("SELECT COUNT(*) FROM care_logs")).isZero();
    }

    // ---- today ----

    @Test
    void todayGroupsDueAndUpcomingTasksAndNamesTheTank() throws Exception {
        LocalDateTime now = LocalDateTime.now(VIETNAM).withNano(0);
        long overdue = createTask(alice, aliceTank, "Qua han", "DAILY", "08:00");
        long general = createTask(alice, null, "Viec chung", "DAILY", "08:00");
        long later = createTask(alice, aliceTank, "Sap toi", "DAILY", "08:00");
        long tomorrow = createTask(alice, aliceTank, "Ngay mai", "DAILY", "08:00");
        long disabled = createTask(alice, aliceTank, "Da tat", "DAILY", "08:00");
        dueAt(overdue, now.minusDays(2));
        dueAt(general, now.minusMinutes(10));
        dueAt(later, now.toLocalDate().plusDays(1).atStartOfDay().minusMinutes(1));
        dueAt(tomorrow, now.toLocalDate().plusDays(1).atStartOfDay());
        send(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/tasks/" + disabled + "/enabled"),
                alice, Map.of("enabled", false)).andExpect(status().isOk());

        send(get("/api/today"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.due", hasSize(2)))
                .andExpect(jsonPath("$.due[0].id").value(overdue))
                .andExpect(jsonPath("$.due[0].tankName").value("Be cua Alice"))
                .andExpect(jsonPath("$.due[1].id").value(general))
                .andExpect(jsonPath("$.due[1].tankName").doesNotExist())
                .andExpect(jsonPath("$.due[1].tankId").doesNotExist())
                .andExpect(jsonPath("$.due[0].timeOfDay").value("08:00"));
        // the "later" task is only upcoming when it is still today; at the very start of the day it is the same
        send(get("/api/today"), alice, null)
                .andExpect(jsonPath("$.upcoming[?(@.id == " + later + ")]", hasSize(
                        now.toLocalTime().isBefore(java.time.LocalTime.of(23, 59)) ? 1 : 0)))
                .andExpect(jsonPath("$.upcoming[?(@.id == " + tomorrow + ")]", hasSize(0)))
                .andExpect(jsonPath("$.upcoming[?(@.id == " + disabled + ")]", hasSize(0)));
    }

    // ---- care history ----

    @Test
    void logsAreNewestFirstAndRespectTheLimit() throws Exception {
        long id = createTask(alice, aliceTank, "Cho an", "DAILY", "08:00");
        for (int i = 0; i < 3; i++) {
            dueAt(id, LocalDateTime.now(VIETNAM).minusHours(1).withNano(0));
            send(post("/api/tasks/" + id + (i == 1 ? "/snooze" : "/complete")), alice, null).andExpect(status().isOk());
        }

        send(get("/api/tanks/" + aliceTank + "/logs"), alice, null)
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].result").value("DONE"))
                .andExpect(jsonPath("$[1].result").value("SNOOZED"));
        send(get("/api/tanks/" + aliceTank + "/logs?limit=2"), alice, null).andExpect(jsonPath("$", hasSize(2)));
        send(get("/api/tanks/" + aliceTank + "/logs?limit=0"), alice, null).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void generalTasksAreLoggedWithoutATankAndListedAsGeneral() throws Exception {
        long id = createTask(alice, null, "Thay nuoc trun chi", "DAILY", "09:00");
        dueAt(id, LocalDateTime.now(VIETNAM).minusHours(1).withNano(0));
        send(post("/api/tasks/" + id + "/complete"), alice, null).andExpect(status().isOk());

        send(get("/api/tasks/general/logs"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].taskTitle").value("Thay nuoc trun chi"))
                .andExpect(jsonPath("$[0].tankId").doesNotExist());
        send(get("/api/tanks/" + aliceTank + "/logs"), alice, null).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void deletingTheTaskKeepsItsLogAndDeletingTheTankRemovesTheTankLogs() throws Exception {
        long id = createTask(alice, aliceTank, "Cho an", "DAILY", "08:00");
        dueAt(id, LocalDateTime.now(VIETNAM).minusHours(1).withNano(0));
        send(post("/api/tasks/" + id + "/complete"), alice, null).andExpect(status().isOk());

        send(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/tasks/" + id), alice, null)
                .andExpect(status().isNoContent());
        send(get("/api/tanks/" + aliceTank + "/logs"), alice, null)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].taskId").doesNotExist())
                .andExpect(jsonPath("$[0].taskTitle").value("Cho an"));

        send(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/tanks/" + aliceTank),
                alice, null).andExpect(status().isNoContent());
        assertThat(count("SELECT COUNT(*) FROM care_logs")).isZero();
    }

    // ---- isolation between users ----

    @Test
    void anotherUserCannotCompleteSnoozeOrReadTheDataOfAlice() throws Exception {
        long inTank = createTask(alice, aliceTank, "Cho an", "DAILY", "08:00");
        long general = createTask(alice, null, "Chung", "DAILY", "08:00");
        dueAt(inTank, LocalDateTime.now(VIETNAM).minusHours(1).withNano(0));
        dueAt(general, LocalDateTime.now(VIETNAM).minusHours(1).withNano(0));
        send(post("/api/tasks/" + general + "/complete"), alice, null).andExpect(status().isOk());
        String dueBefore = jdbc.sql("SELECT next_due_at FROM care_tasks WHERE id = :id").param("id", inTank)
                .query(String.class).single();

        send(post("/api/tasks/" + inTank + "/complete"), bob, null).andExpect(status().isNotFound());
        send(post("/api/tasks/" + inTank + "/snooze"), bob, null).andExpect(status().isNotFound());
        send(post("/api/tasks/" + general + "/complete"), bob, null).andExpect(status().isNotFound());
        send(get("/api/tanks/" + aliceTank + "/logs"), bob, null).andExpect(status().isNotFound());
        send(get("/api/tasks/general/logs"), bob, null).andExpect(jsonPath("$", hasSize(0)));
        send(get("/api/today"), bob, null)
                .andExpect(jsonPath("$.due", hasSize(0)))
                .andExpect(jsonPath("$.upcoming", hasSize(0)));

        assertThat(count("SELECT COUNT(*) FROM care_logs")).isEqualTo(1);
        assertThat(jdbc.sql("SELECT next_due_at FROM care_tasks WHERE id = :id").param("id", inTank)
                .query(String.class).single()).isEqualTo(dueBefore);
    }
}
