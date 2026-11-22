package com.fishcaring.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
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
 * Full stack for the care task routes on H2 with the real migrations. The JWT uses the system clock,
 * so dates are built relative to today in Vietnam time; exact schedule maths is in
 * {@code ScheduleCalculatorTest}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CareTaskControllerTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

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

    private static Map<String, Object> task(String type, String title, String repeat, String time) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", type);
        body.put("title", title);
        body.put("repeatType", repeat);
        body.put("timeOfDay", time);
        return body;
    }

    /** POST /api/tasks with the task in the given tank (a null tank id means no tank). */
    private ResultActions postToTank(String token, Long tankId, Map<String, Object> body) throws Exception {
        Map<String, Object> withTank = new LinkedHashMap<>(body);
        withTank.put("tankId", tankId);
        return send(post("/api/tasks"), token, withTank);
    }

    private long createTask(String token, Long tankId, Map<String, Object> body) throws Exception {
        String response = postToTank(token, tankId, body)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(response, "$.id")).longValue();
    }

    private String column(long taskId, String column) {
        return jdbc.sql("SELECT " + column + " FROM care_tasks WHERE id = :id").param("id", taskId)
                .query(String.class).single();
    }

    // ---- authentication ----

    @Test
    void everyTaskRouteRequiresAToken() throws Exception {
        mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/tasks/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/tasks/1/enabled").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/tasks/1")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/tasks/1")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/tasks/general")).andExpect(status().isUnauthorized());
    }

    // ---- create ----

    @Test
    void createDailyReturns201WithTheJsonFormats() throws Exception {
        postToTank(alice, aliceTank, task("FEED", "Cho an", "DAILY", "08:00"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.tankId").value(aliceTank))
                .andExpect(jsonPath("$.type").value("FEED"))
                .andExpect(jsonPath("$.repeatType").value("DAILY"))
                .andExpect(jsonPath("$.timeOfDay").value("08:00"))
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.intervalDays").doesNotExist())
                .andExpect(jsonPath("$.nextDueAt").value(org.hamcrest.Matchers.matchesPattern(
                        "\\d{4}-\\d{2}-\\d{2}T08:00:00")));
    }

    @Test
    void createEveryNDaysUsesTheStartDateStepsAndStoresTheDetail() throws Exception {
        Map<String, Object> body = task("WATER_CHANGE", "Thay nuoc", "EVERY_N_DAYS", "19:00");
        body.put("intervalDays", 7);
        body.put("startDate", TODAY.plusDays(3).toString());
        body.put("waterChangePercent", 30);

        postToTank(alice, aliceTank, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.intervalDays").value(7))
                .andExpect(jsonPath("$.startDate").value(TODAY.plusDays(3).toString()))
                .andExpect(jsonPath("$.waterChangePercent").value(30))
                .andExpect(jsonPath("$.nextDueAt").value(TODAY.plusDays(3) + "T19:00:00"));
    }

    @Test
    void createOnceInTheFutureUsesItsDateAndTime() throws Exception {
        Map<String, Object> body = task("OTHER", "Ve sinh loc", "ONCE", "21:30");
        body.put("startDate", TODAY.plusDays(2).toString());

        postToTank(alice, aliceTank, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nextDueAt").value(TODAY.plusDays(2) + "T21:30:00"));
    }

    @Test
    void createStoresTheDetailOfEachTypeAndIgnoresTheOthers() throws Exception {
        Map<String, Object> feed = task("FEED", "Cho an", "DAILY", "08:00");
        feed.put("foodName", "Hat 1mm");
        feed.put("waterChangePercent", 30);
        feed.put("fertilizerMl", 5);
        postToTank(alice, aliceTank, feed)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.foodName").value("Hat 1mm"))
                .andExpect(jsonPath("$.waterChangePercent").doesNotExist())
                .andExpect(jsonPath("$.fertilizerMl").doesNotExist());

        Map<String, Object> fertilize = task("FERTILIZE", "Bon phan", "DAILY", "08:00");
        fertilize.put("fertilizerMl", 5.5);
        fertilize.put("foodName", "Hat");
        long id = createTask(alice, aliceTank, fertilize);
        assertThat(column(id, "fertilizer_ml")).isEqualTo("5.5");
        assertThat(jdbc.sql("SELECT food_name FROM care_tasks WHERE id = :id").param("id", id)
                .query(String.class).optional()).isEmpty();
    }

    @Test
    void createRejectsBadInputWithFieldErrors() throws Exception {
        Map<String, Object> body = task("NOPE", " ", "DAILY", "08:00");
        postToTank(alice, aliceTank, body).andExpect(status().isBadRequest());

        Map<String, Object> blank = task("FEED", " ", "DAILY", "08:00");
        postToTank(alice, aliceTank, blank)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.title").exists());

        for (int percent : new int[] {0, 101}) {
            Map<String, Object> water = task("WATER_CHANGE", "Thay", "DAILY", "08:00");
            water.put("waterChangePercent", percent);
            postToTank(alice, aliceTank, water)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors.waterChangePercent").exists());
        }
        for (Object ml : new Object[] {0, 1000.1, 5.55}) {
            Map<String, Object> fert = task("FERTILIZE", "Bon", "DAILY", "08:00");
            fert.put("fertilizerMl", ml);
            postToTank(alice, aliceTank, fert)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors.fertilizerMl").exists());
        }
    }

    @Test
    void createRejectsScheduleMistakesOnTheirField() throws Exception {
        Map<String, Object> noInterval = task("FEED", "Cho an", "EVERY_N_DAYS", "08:00");
        noInterval.put("startDate", TODAY.toString());
        postToTank(alice, aliceTank, noInterval)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.intervalDays").exists());

        Map<String, Object> noStart = task("FEED", "Cho an", "EVERY_N_DAYS", "08:00");
        noStart.put("intervalDays", 61);
        postToTank(alice, aliceTank, noStart)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.intervalDays").exists())
                .andExpect(jsonPath("$.fieldErrors.startDate").exists());

        Map<String, Object> past = task("OTHER", "Viec", "ONCE", "08:00");
        past.put("startDate", TODAY.minusDays(1).toString());
        postToTank(alice, aliceTank, past)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.startDate").exists());

        Map<String, Object> badTime = task("FEED", "Cho an", "DAILY", "25:99");
        postToTank(alice, aliceTank, badTime).andExpect(status().isBadRequest());
    }

    // ---- update, toggle, delete ----

    @Test
    void updateChangesTheTaskAndKeepsTheDueTimeWhenOnlyTextChanges() throws Exception {
        long id = createTask(alice, aliceTank, task("FEED", "Cho an", "DAILY", "08:00"));
        String due = column(id, "next_due_at");

        Map<String, Object> edit = task("WATER_CHANGE", "Thay nuoc", "DAILY", "08:00");
        edit.put("waterChangePercent", 25);
        edit.put("note", "ghi chu");
        send(put("/api/tasks/" + id), alice, edit)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Thay nuoc"))
                .andExpect(jsonPath("$.type").value("WATER_CHANGE"))
                .andExpect(jsonPath("$.waterChangePercent").value(25))
                .andExpect(jsonPath("$.note").value("ghi chu"));
        assertThat(column(id, "next_due_at")).isEqualTo(due);

        send(put("/api/tasks/" + id), alice, task("WATER_CHANGE", "Thay nuoc", "DAILY", "23:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextDueAt").value(org.hamcrest.Matchers.endsWith("T23:59:00")));
    }

    @Test
    void disablingClearsTheDueTimeAndEnablingRestoresIt() throws Exception {
        long id = createTask(alice, aliceTank, task("FEED", "Cho an", "DAILY", "08:00"));

        send(patch("/api/tasks/" + id + "/enabled"), alice, Map.of("enabled", false))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.nextDueAt").doesNotExist());
        send(patch("/api/tasks/" + id + "/enabled"), alice, Map.of("enabled", true))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.nextDueAt").exists());
        send(patch("/api/tasks/" + id + "/enabled"), alice, Map.of())
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteRemovesTheTaskAndKeepsItsLogsWithoutATaskId() throws Exception {
        long id = createTask(alice, aliceTank, task("FEED", "Cho an", "DAILY", "08:00"));
        jdbc.sql("""
                INSERT INTO care_logs (tank_id, task_id, task_title, result, due_at, acted_at, created_at, updated_at)
                VALUES (:tank, :task, 'Cho an', 'DONE', NOW(), NOW(), NOW(), NOW())
                """).param("tank", aliceTank).param("task", id).update();

        send(delete("/api/tasks/" + id), alice, null).andExpect(status().isNoContent());

        assertThat(jdbc.sql("SELECT COUNT(*) FROM care_tasks").query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("SELECT COUNT(*) FROM care_logs WHERE task_id IS NULL").query(Integer.class).single())
                .isEqualTo(1);
    }

    // ---- listing inside the tank ----

    @Test
    void tankDetailListsEnabledTasksFirstByDueTimeAndDisabledLast() throws Exception {
        Map<String, Object> eveningBody = task("FEED", "Toi", "EVERY_N_DAYS", "19:00");
        eveningBody.put("intervalDays", 2);
        eveningBody.put("startDate", TODAY.plusDays(5).toString());
        long evening = createTask(alice, aliceTank, eveningBody);
        long disabled = createTask(alice, aliceTank, task("FEED", "Tat", "DAILY", "06:00"));
        Map<String, Object> soonBody = task("OTHER", "Som", "ONCE", "07:00");
        soonBody.put("startDate", TODAY.plusDays(1).toString());
        long soon = createTask(alice, aliceTank, soonBody);
        send(patch("/api/tasks/" + disabled + "/enabled"), alice, Map.of("enabled", false)).andExpect(status().isOk());

        send(get("/api/tanks/" + aliceTank), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasks", hasSize(3)))
                .andExpect(jsonPath("$.tasks[0].id").value(soon))
                .andExpect(jsonPath("$.tasks[1].id").value(evening))
                .andExpect(jsonPath("$.tasks[2].id").value(disabled));

        send(get("/api/tanks"), alice, null)
                .andExpect(jsonPath("$[0].taskCount").value(3))
                .andExpect(jsonPath("$[0].nextDueAt").value(TODAY.plusDays(1) + "T07:00:00"));
    }

    // ---- isolation between users ----

    @Test
    void anotherUserCannotTouchTasksOrTanksOfAlice() throws Exception {
        long id = createTask(alice, aliceTank, task("FEED", "Cho an", "DAILY", "08:00"));
        String due = column(id, "next_due_at");

        postToTank(bob, aliceTank, task("FEED", "Hack", "DAILY", "08:00"))
                .andExpect(status().isNotFound());
        send(put("/api/tasks/" + id), bob, task("FEED", "Hack", "DAILY", "09:00")).andExpect(status().isNotFound());
        send(patch("/api/tasks/" + id + "/enabled"), bob, Map.of("enabled", false)).andExpect(status().isNotFound());
        send(delete("/api/tasks/" + id), bob, null).andExpect(status().isNotFound());

        assertThat(jdbc.sql("SELECT COUNT(*) FROM care_tasks").query(Integer.class).single()).isEqualTo(1);
        assertThat(column(id, "title")).isEqualTo("Cho an");
        assertThat(column(id, "next_due_at")).isEqualTo(due);
        assertThat(column(id, "enabled")).isIn("TRUE", "true", "1");

        send(get("/api/tanks/" + aliceTank), bob, null).andExpect(status().isNotFound());
    }

    // ---- tasks without a tank ----

    @Test
    void createWithoutATankReturnsAGeneralTaskAndListsIt() throws Exception {
        Map<String, Object> body = task("WATER_CHANGE", "Thay nuoc trun chi", "DAILY", "09:00");
        body.put("waterChangePercent", 20);

        long id = createTask(alice, null, body);

        send(get("/api/tasks/general"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].tankId").doesNotExist())
                .andExpect(jsonPath("$[0].waterChangePercent").value(20));
        send(get("/api/tasks/" + id), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Thay nuoc trun chi"));
        // a general task is not listed in a tank, and does not count for a tank
        send(get("/api/tanks/" + aliceTank), alice, null).andExpect(jsonPath("$.tasks", hasSize(0)));
        send(get("/api/tanks"), alice, null).andExpect(jsonPath("$[0].taskCount").value(0));
    }

    @Test
    void updateMovesATaskBetweenATankAndNoTankAndKeepsTheDueTime() throws Exception {
        long id = createTask(alice, null, task("FEED", "Cho an", "DAILY", "08:00"));
        String due = column(id, "next_due_at");

        Map<String, Object> edit = task("FEED", "Cho an", "DAILY", "08:00");
        edit.put("tankId", aliceTank);
        send(put("/api/tasks/" + id), alice, edit)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tankId").value(aliceTank));
        assertThat(column(id, "next_due_at")).isEqualTo(due);
        send(get("/api/tanks/" + aliceTank), alice, null).andExpect(jsonPath("$.tasks", hasSize(1)));

        edit.put("tankId", null);
        send(put("/api/tasks/" + id), alice, edit)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tankId").doesNotExist());
        send(get("/api/tasks/general"), alice, null).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void anotherUserCannotUseSeeOrChangeGeneralTasksOrBorrowATank() throws Exception {
        long general = createTask(alice, null, task("FEED", "Chung cua Alice", "DAILY", "08:00"));
        long inTank = createTask(alice, aliceTank, task("FEED", "Trong be", "DAILY", "08:00"));

        send(get("/api/tasks/general"), bob, null).andExpect(jsonPath("$", hasSize(0)));
        send(get("/api/tasks/" + general), bob, null).andExpect(status().isNotFound());
        send(put("/api/tasks/" + general), bob, task("FEED", "Hack", "DAILY", "09:00")).andExpect(status().isNotFound());
        send(patch("/api/tasks/" + general + "/enabled"), bob, Map.of("enabled", false)).andExpect(status().isNotFound());
        send(delete("/api/tasks/" + general), bob, null).andExpect(status().isNotFound());

        // Bob cannot move his own task into Alice's tank, and cannot take Alice's task into his tank
        long bobsTask = createTask(bob, null, task("FEED", "Cua Bob", "DAILY", "08:00"));
        Map<String, Object> move = task("FEED", "Cua Bob", "DAILY", "08:00");
        move.put("tankId", aliceTank);
        send(put("/api/tasks/" + bobsTask), bob, move).andExpect(status().isNotFound());
        send(put("/api/tasks/" + inTank), bob, task("FEED", "Hack", "DAILY", "09:00")).andExpect(status().isNotFound());

        assertThat(column(general, "title")).isEqualTo("Chung cua Alice");
        assertThat(jdbc.sql("SELECT tank_id FROM care_tasks WHERE id = :id").param("id", bobsTask)
                .query(Long.class).optional()).isEmpty();
    }

    @Test
    void deletingATankKeepsTheGeneralTasksOfTheUser() throws Exception {
        long general = createTask(alice, null, task("FEED", "Chung", "DAILY", "08:00"));
        createTask(alice, aliceTank, task("FEED", "Trong be", "DAILY", "08:00"));

        send(delete("/api/tanks/" + aliceTank), alice, null).andExpect(status().isNoContent());

        assertThat(jdbc.sql("SELECT COUNT(*) FROM care_tasks").query(Integer.class).single()).isEqualTo(1);
        send(get("/api/tasks/" + general), alice, null).andExpect(status().isOk());
    }
}
