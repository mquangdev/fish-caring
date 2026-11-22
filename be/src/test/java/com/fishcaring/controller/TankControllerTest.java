package com.fishcaring.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** Full stack for /api/tanks on H2 with the real migrations. Rolls back after each test. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TankControllerTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcClient jdbc;
    @Autowired
    private ObjectMapper objectMapper;

    private String alice;
    private String bob;

    @BeforeEach
    void registerTwoUsers() throws Exception {
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

    private static Map<String, Object> fish(String species, int quantity, String status) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("speciesName", species);
        row.put("quantity", quantity);
        row.put("status", status);
        return row;
    }

    private static Map<String, Object> tank(String name, Object... fishRows) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("volumeLiters", 60);
        body.put("setupDate", "2026-01-15");
        body.put("note", "ghi chu");
        body.put("fish", new ArrayList<>(List.of(fishRows)));
        return body;
    }

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
                               String token, Object body) throws Exception {
        var builder = request.header("Authorization", "Bearer " + token);
        if (body != null) {
            builder = builder.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        return mvc.perform(builder);
    }

    private long createTank(String token, Map<String, Object> body) throws Exception {
        String response = send(post("/api/tanks"), token, body)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(response, "$.id")).longValue();
    }

    private int count(String sql) {
        return jdbc.sql(sql).query(Integer.class).single();
    }

    // ---- authentication ----

    @Test
    void everyRouteRequiresAToken() throws Exception {
        mvc.perform(get("/api/tanks")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/tanks").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/tanks/1")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/tanks/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/tanks/1")).andExpect(status().isUnauthorized());
    }

    // ---- create and read ----

    @Test
    void createReturns201WithAllFieldsAndFishAndNoOwner() throws Exception {
        send(post("/api/tanks"), alice, tank("Bể thủy sinh", fish("Neon", 10, "ALIVE")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Bể thủy sinh"))
                .andExpect(jsonPath("$.volumeLiters").value(60.0))
                .andExpect(jsonPath("$.lengthCm").doesNotExist())
                .andExpect(jsonPath("$.type").doesNotExist())
                .andExpect(jsonPath("$.setupDate").value("2026-01-15"))
                .andExpect(jsonPath("$.note").value("ghi chu"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.fish", hasSize(1)))
                .andExpect(jsonPath("$.fish[0].speciesName").value("Neon"))
                .andExpect(jsonPath("$.fish[0].quantity").value(10))
                .andExpect(jsonPath("$.fish[0].status").value("ALIVE"))
                .andExpect(content().string(not(containsString("userId"))));
    }

    @Test
    void optionalFieldsMayBeMissing() throws Exception {
        Map<String, Object> minimal = new LinkedHashMap<>();
        minimal.put("name", "Be nho");

        send(post("/api/tanks"), alice, minimal)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.volumeLiters").doesNotExist())
                .andExpect(jsonPath("$.fish", hasSize(0)));
    }

    @Test
    void theSameNameCanBeUsedTwice() throws Exception {
        createTank(alice, tank("Be 1"));
        createTank(alice, tank("be 1"));
        createTank(alice, tank("Be 1"));

        send(get("/api/tanks"), alice, null).andExpect(jsonPath("$", hasSize(3)));
    }

    @Test
    void listIsOwnTanksNewestFirstWithTaskCountAndNextDue() throws Exception {
        long first = createTank(alice, tank("Be A"));
        long second = createTank(alice, tank("Be B"));
        createTank(bob, tank("Be cua Bob"));
        long userId = jdbc.sql("SELECT id FROM users WHERE email = 'alice@example.com'")
                .query(Long.class).single();
        // two enabled tasks (due 2026-12-02 and 2026-12-01) and one disabled task due earlier
        insertTask(first, true, "2026-12-02 08:00:00");
        insertTask(first, true, "2026-12-01 19:00:00");
        insertTask(first, false, "2026-11-30 07:00:00");

        send(get("/api/tanks"), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].id", contains((int) second, (int) first)))
                .andExpect(jsonPath("$[0].taskCount").value(0))
                .andExpect(jsonPath("$[0].nextDueAt").doesNotExist())
                .andExpect(jsonPath("$[1].taskCount").value(3))
                .andExpect(jsonPath("$[1].nextDueAt").value("2026-12-01T19:00:00"))
                .andExpect(content().string(not(containsString("Be cua Bob"))));
        assertThat(userId).isPositive();
    }

    private void insertTask(long tankId, boolean enabled, String nextDueAt) {
        jdbc.sql("""
                INSERT INTO care_tasks (tank_id, type, title, repeat_type, time_of_day, enabled, next_due_at,
                                        created_at, updated_at)
                VALUES (:tankId, 'FEED', 'Cho an', 'DAILY', '08:00:00', :enabled, :nextDueAt, NOW(), NOW())
                """)
                .param("tankId", tankId)
                .param("enabled", enabled)
                .param("nextDueAt", java.sql.Timestamp.valueOf(nextDueAt))
                .update();
    }

    @Test
    void fishComeBackInTheOrderTheyWereSentNewestFirst() throws Exception {
        long id = createTank(alice, tank("Be",
                fish("Moi nhat", 1, "ALIVE"), fish("Giua", 2, "DEAD"), fish("Cu nhat", 3, "ALIVE")));

        send(get("/api/tanks/" + id), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fish[*].speciesName", contains("Moi nhat", "Giua", "Cu nhat")))
                .andExpect(jsonPath("$.fish[1].status").value("DEAD"));
    }

    // ---- update ----

    @Test
    void updateReplacesTheWholeFishListAndKeepsCreatedAt() throws Exception {
        long id = createTank(alice, tank("Cu", fish("Neon", 10, "ALIVE"), fish("Guppy", 3, "ALIVE")));
        String created = JsonPath.read(send(get("/api/tanks/" + id), alice, null)
                .andReturn().getResponse().getContentAsString(), "$.createdAt");

        Map<String, Object> changed = tank("Moi", fish("Pleco", 1, "ALIVE"), fish("Neon", 8, "DEAD"));
        changed.put("volumeLiters", 90);
        send(put("/api/tanks/" + id), alice, changed)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Moi"))
                .andExpect(jsonPath("$.volumeLiters").value(90.0))
                .andExpect(jsonPath("$.createdAt").value(created))
                .andExpect(jsonPath("$.fish[*].speciesName", contains("Pleco", "Neon")))
                .andExpect(jsonPath("$.fish[1].status").value("DEAD"));

        assertThat(count("SELECT COUNT(*) FROM tank_fish")).isEqualTo(2);
    }

    @Test
    void addingAFishAtTheTopKeepsItOnTopAfterSaving() throws Exception {
        long id = createTank(alice, tank("Be", fish("Cu", 1, "ALIVE")));

        send(put("/api/tanks/" + id), alice, tank("Be", fish("Moi them", 2, "ALIVE"), fish("Cu", 1, "ALIVE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fish[*].speciesName", contains("Moi them", "Cu")));
    }

    @Test
    void updateWithAnEmptyFishListRemovesAllFish() throws Exception {
        long id = createTank(alice, tank("Be", fish("Neon", 10, "ALIVE")));

        send(put("/api/tanks/" + id), alice, tank("Be"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fish", hasSize(0)));
        assertThat(count("SELECT COUNT(*) FROM tank_fish")).isZero();
    }

    // ---- validation ----

    @Test
    void invalidInputReturns400WithFieldErrors() throws Exception {
        Map<String, Object> bad = tank("", fish("", 0, "ALIVE"));
        bad.put("volumeLiters", 0);

        send(post("/api/tanks"), alice, bad)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.volumeLiters").exists())
                .andExpect(jsonPath("$.fieldErrors['fish[0].speciesName']").exists())
                .andExpect(jsonPath("$.fieldErrors['fish[0].quantity']").exists());
    }

    @Test
    void limitsOnLengthsAndNumbersAreEnforced() throws Exception {
        assertBad(tank("x".repeat(101)), "name");

        Map<String, Object> negative = tank("Be");
        negative.put("volumeLiters", -5);
        assertBad(negative, "volumeLiters");

        Map<String, Object> huge = tank("Be");
        huge.put("volumeLiters", 10001);
        assertBad(huge, "volumeLiters");

        Map<String, Object> longNote = tank("Be");
        longNote.put("note", "n".repeat(1001));
        assertBad(longNote, "note");

        assertBad(tank("Be", fish("Neon", 10000, "ALIVE")), "fish[0].quantity");
        assertBad(tank("Be", fish("s".repeat(101), 1, "ALIVE")), "fish[0].speciesName");
    }

    @Test
    void atMostFiftyFishRows() throws Exception {
        List<Object> rows = new ArrayList<>();
        for (int i = 0; i < 51; i++) {
            rows.add(fish("Loai " + i, 1, "ALIVE"));
        }
        assertBad(tank("Be", rows.toArray()), "fish");

        send(post("/api/tanks"), alice, tank("Be", rows.subList(0, 50).toArray())).andExpect(status().isCreated());
    }

    @Test
    void unknownFishStatusOrBrokenJsonReturns400() throws Exception {
        send(post("/api/tanks"), alice, tank("Be", fish("Neon", 1, "SLEEPING"))).andExpect(status().isBadRequest());

        mvc.perform(post("/api/tanks").header("Authorization", "Bearer " + alice)
                        .contentType(MediaType.APPLICATION_JSON).content("{broken"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    // ---- size: dimensions or volume ----

    private static Map<String, Object> sized(Object volume, Object length, Object width, Object height) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", "Be");
        body.put("volumeLiters", volume);
        body.put("lengthCm", length);
        body.put("widthCm", width);
        body.put("heightCm", height);
        return body;
    }

    @Test
    void dimensionsAreStoredAndTheServerCalculatesTheVolume() throws Exception {
        long id = ((Number) JsonPath.read(send(post("/api/tanks"), alice, sized(999, 60, 30, 36))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.volumeLiters").value(64.8))
                .andExpect(jsonPath("$.lengthCm").value(60.0))
                .andExpect(jsonPath("$.widthCm").value(30.0))
                .andExpect(jsonPath("$.heightCm").value(36.0))
                .andReturn().getResponse().getContentAsString(), "$.id")).longValue();

        send(get("/api/tanks/" + id), alice, null)
                .andExpect(jsonPath("$.volumeLiters").value(64.8))
                .andExpect(jsonPath("$.heightCm").value(36.0));
        send(get("/api/tanks"), alice, null).andExpect(jsonPath("$[0].volumeLiters").value(64.8));
    }

    @Test
    void decimalDimensionsAndRoundingHalfUp() throws Exception {
        // 10.5 x 10 x 10 cm = 1.05 L, rounded half up to 1.1
        send(post("/api/tanks"), alice, sized(null, 10.5, 10, 10))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.volumeLiters").value(1.1))
                .andExpect(jsonPath("$.lengthCm").value(10.5));
    }

    @Test
    void aVolumeAloneIsKeptWithItsDecimalAndNoDimensions() throws Exception {
        send(post("/api/tanks"), alice, sized(64.8, null, null, null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.volumeLiters").value(64.8))
                .andExpect(jsonPath("$.lengthCm").doesNotExist());
    }

    @Test
    void aPartialSetOfDimensionsIsRejectedPerMissingField() throws Exception {
        send(post("/api/tanks"), alice, sized(null, 60, null, 36))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.widthCm").exists())
                .andExpect(jsonPath("$.fieldErrors.lengthCm").doesNotExist());
        send(get("/api/tanks"), alice, null).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void dimensionAndVolumeLimitsAreEnforced() throws Exception {
        assertBad(sized(null, 0, 30, 36), "lengthCm");
        assertBad(sized(null, -1, 30, 36), "lengthCm");
        assertBad(sized(null, 60, 1000.1, 36), "widthCm");
        assertBad(sized(null, 60, 30, 36.55), "heightCm");
        assertBad(sized(0.05, null, null, null), "volumeLiters");
        assertBad(sized(10000.1, null, null, null), "volumeLiters");
        assertBad(sized(64.85, null, null, null), "volumeLiters");
    }

    @Test
    void aCalculatedVolumeAboveTheLimitIsRejected() throws Exception {
        assertBad(sized(null, 1000, 1000, 11), "volumeLiters");
        send(post("/api/tanks"), alice, sized(null, 1000, 100, 100))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.volumeLiters").value(10000.0));
    }

    @Test
    void updatingWithoutDimensionsClearsThem() throws Exception {
        long id = createTank(alice, sized(null, 60, 30, 36));

        send(put("/api/tanks/" + id), alice, sized(70, null, null, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.volumeLiters").value(70.0))
                .andExpect(jsonPath("$.lengthCm").doesNotExist())
                .andExpect(jsonPath("$.widthCm").doesNotExist())
                .andExpect(jsonPath("$.heightCm").doesNotExist());
    }

    @Test
    void updatingWithDimensionsRecalculatesTheVolume() throws Exception {
        long id = createTank(alice, sized(50, null, null, null));

        send(put("/api/tanks/" + id), alice, sized(null, 100, 50, 50))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.volumeLiters").value(250.0))
                .andExpect(jsonPath("$.lengthCm").value(100.0));
    }

    @Test
    void theRemovedTankTypeIsIgnoredIfAnOldClientStillSendsIt() throws Exception {
        Map<String, Object> old = sized(60, null, null, null);
        old.put("type", "PLANTED");

        send(post("/api/tanks"), alice, old)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").doesNotExist());
    }

    @Test
    void aNonNumericIdReturns400() throws Exception {
        send(get("/api/tanks/abc"), alice, null).andExpect(status().isBadRequest());
    }

    private void assertBad(Map<String, Object> body, String field) throws Exception {
        send(post("/api/tanks"), alice, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors['" + field + "']").exists());
    }

    // ---- data isolation between users (spec test 11) ----

    @Test
    void anotherUserCanNeitherSeeChangeNorDeleteMyTank() throws Exception {
        long id = createTank(alice, tank("Be cua Alice", fish("Neon", 10, "ALIVE")));

        send(get("/api/tanks/" + id), bob, null).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        send(put("/api/tanks/" + id), bob, tank("Hack", fish("Virus", 1, "ALIVE"))).andExpect(status().isNotFound());
        send(delete("/api/tanks/" + id), bob, null).andExpect(status().isNotFound());
        send(get("/api/tanks"), bob, null).andExpect(jsonPath("$", hasSize(0)));

        send(get("/api/tanks/" + id), alice, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Be cua Alice"))
                .andExpect(jsonPath("$.fish[0].speciesName").value("Neon"));
    }

    @Test
    void unknownIdIsNotFound() throws Exception {
        send(get("/api/tanks/999999"), alice, null).andExpect(status().isNotFound());
        send(put("/api/tanks/999999"), alice, tank("Be")).andExpect(status().isNotFound());
        send(delete("/api/tanks/999999"), alice, null).andExpect(status().isNotFound());
    }

    // ---- delete ----

    @Test
    void deleteReturns204RemovesTheTankAndEverythingInIt() throws Exception {
        long id = createTank(alice, tank("Be", fish("Neon", 10, "ALIVE")));
        insertTask(id, true, "2026-12-01 08:00:00");
        long taskId = jdbc.sql("SELECT id FROM care_tasks WHERE tank_id = :id").param("id", id)
                .query(Long.class).single();
        jdbc.sql("""
                INSERT INTO care_logs (tank_id, task_id, task_title, result, due_at, acted_at, created_at, updated_at)
                VALUES (:tankId, :taskId, 'Cho an', 'DONE', NOW(), NOW(), NOW(), NOW())
                """).param("tankId", id).param("taskId", taskId).update();

        send(delete("/api/tanks/" + id), alice, null).andExpect(status().isNoContent());

        send(get("/api/tanks/" + id), alice, null).andExpect(status().isNotFound());
        assertThat(count("SELECT COUNT(*) FROM tank_fish")).isZero();
        assertThat(count("SELECT COUNT(*) FROM care_tasks")).isZero();
        assertThat(count("SELECT COUNT(*) FROM care_logs")).isZero();
    }
}
