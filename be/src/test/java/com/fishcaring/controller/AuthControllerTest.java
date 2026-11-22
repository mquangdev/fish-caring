package com.fishcaring.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/** Full stack (security filter, controller, service, JDBC on H2 with real migrations). Rolls back each test. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcClient jdbc;
    @Autowired
    private JwtEncoder jwtEncoder;

    private static String registerJson(String email, String password, String name) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"displayName\":\"" + name + "\"}";
    }

    private ResultActions register(String email, String password, String name) throws Exception {
        return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(registerJson(email, password, name)));
    }

    private ResultActions login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
    }

    private String tokenOf(ResultActions result) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.token");
    }

    // ---- register ----

    @Test
    void registerReturns201WithTokenAndUserButNoPasswordHash() throws Exception {
        register("alice@example.com", "secret-pass", "Alice")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.id").isNumber())
                .andExpect(jsonPath("$.user.email").value("alice@example.com"))
                .andExpect(jsonPath("$.user.displayName").value("Alice"))
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString("secret-pass"))));
    }

    @Test
    void registeredPasswordIsStoredHashedNeverPlain() throws Exception {
        register("alice@example.com", "secret-pass", "Alice").andExpect(status().isCreated());

        String stored = jdbc.sql("SELECT password_hash FROM users WHERE email = 'alice@example.com'")
                .query(String.class).single();
        assertThat(stored).isNotEqualTo("secret-pass").startsWith("$2");
    }

    @Test
    void duplicateEmailIsRejectedEvenWithDifferentCase() throws Exception {
        register("alice@example.com", "secret-pass", "Alice").andExpect(status().isCreated());

        register("ALICE@Example.com", "another-pass", "Other")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    void invalidRegistrationReturns400WithFieldErrors() throws Exception {
        register("not-an-email", "short", "")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists())
                .andExpect(jsonPath("$.fieldErrors.displayName").exists());
    }

    @Test
    void passwordLongerThanBcryptLimitIsRejected() throws Exception {
        register("alice@example.com", "x".repeat(73), "Alice")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void malformedOrEmptyBodyReturns400() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{broken"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    // ---- login ----

    @Test
    void loginWithCorrectCredentialsReturnsToken() throws Exception {
        register("alice@example.com", "secret-pass", "Alice").andExpect(status().isCreated());

        login("Alice@Example.com", "secret-pass")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("alice@example.com"));
    }

    @Test
    void wrongPasswordAndUnknownEmailGiveTheSame401() throws Exception {
        register("alice@example.com", "secret-pass", "Alice").andExpect(status().isCreated());

        String wrongPassword = login("alice@example.com", "bad-password")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn().getResponse().getContentAsString();
        String unknownEmail = login("nobody@example.com", "secret-pass")
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(unknownEmail).isEqualTo(wrongPassword);
    }

    // ---- /api/me and protection ----

    @Test
    void protectedRoutesRequireAToken() throws Exception {
        mvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/tanks")).andExpect(status().isUnauthorized());
    }

    @Test
    void garbageTamperedAndForeignTokensAreRejected() throws Exception {
        String valid = tokenOf(register("alice@example.com", "secret-pass", "Alice"));

        mvc.perform(get("/api/me").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + valid.substring(0, valid.length() - 3) + "abc"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + tokenSignedWith("a-different-secret-a-different-secret!!", Duration.ofDays(1))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        long userId = JsonPath.<Integer>read(register("alice@example.com", "secret-pass", "Alice")
                .andReturn().getResponse().getContentAsString(), "$.user.id");
        Instant past = Instant.now().minus(Duration.ofDays(10));
        JwtClaimsSet claims = JwtClaimsSet.builder().subject(String.valueOf(userId))
                .issuedAt(past).expiresAt(past.plus(Duration.ofDays(1))).build();
        String expired = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validTokenReturnsOwnProfile() throws Exception {
        String token = tokenOf(register("alice@example.com", "secret-pass", "Alice"));

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.displayName").value("Alice"))
                .andExpect(content().string(not(containsString("password"))));
    }

    @Test
    void eachTokenOnlySeesItsOwnUser() throws Exception {
        String alice = tokenOf(register("alice@example.com", "secret-pass", "Alice"));
        String bob = tokenOf(register("bob@example.com", "secret-pass", "Bob"));

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + alice))
                .andExpect(jsonPath("$.email").value("alice@example.com"));
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + bob))
                .andExpect(jsonPath("$.email").value("bob@example.com"));
    }

    @Test
    void tokenOfADeletedUserIsRejected() throws Exception {
        String token = tokenOf(register("alice@example.com", "secret-pass", "Alice"));
        jdbc.sql("DELETE FROM users WHERE email = 'alice@example.com'").update();

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void patchMeChangesDisplayNameAndUpdatedAtOnly() throws Exception {
        String token = tokenOf(register("alice@example.com", "secret-pass", "Alice"));
        LocalDateTime before = jdbc.sql("SELECT created_at FROM users WHERE email = 'alice@example.com'")
                .query(LocalDateTime.class).single();

        mvc.perform(patch("/api/me").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\"  Alice Nguyen  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Alice Nguyen"));

        LocalDateTime createdAt = jdbc.sql("SELECT created_at FROM users WHERE email = 'alice@example.com'")
                .query(LocalDateTime.class).single();
        assertThat(createdAt).isEqualTo(before);
    }

    @Test
    void patchMeValidatesInputAndRequiresAToken() throws Exception {
        String token = tokenOf(register("alice@example.com", "secret-pass", "Alice"));

        mvc.perform(patch("/api/me").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.displayName").exists());
        mvc.perform(patch("/api/me").contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\"X\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthStaysPublic() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    private String tokenSignedWith(String secret, Duration lifetime) {
        SecretKey key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().subject("1").issuedAt(now).expiresAt(now.plus(lifetime)).build();
        return new NimbusJwtEncoder(new ImmutableSecret<>(key))
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }
}
