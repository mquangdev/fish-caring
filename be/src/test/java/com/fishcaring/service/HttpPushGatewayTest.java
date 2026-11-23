package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The gateway against a small HTTP server that plays the push service. */
class HttpPushGatewayTest {

    private HttpServer server;
    private final AtomicReference<com.sun.net.httpserver.Headers> seenHeaders = new AtomicReference<>();
    private final AtomicReference<byte[]> seenBody = new AtomicReference<>();
    private final AtomicReference<String> seenMethod = new AtomicReference<>();
    private volatile int answer = 201;

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/push", exchange -> {
            seenHeaders.set(exchange.getRequestHeaders());
            seenBody.set(exchange.getRequestBody().readAllBytes());
            seenMethod.set(exchange.getRequestMethod());
            exchange.sendResponseHeaders(answer, -1);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private String endpoint() {
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/push/abc";
    }

    @Test
    void postsTheBodyWithTheWebPushHeaders() {
        byte[] body = {1, 2, 3, 4, 5};

        int status = new HttpPushGateway().send(endpoint(), body, "vapid t=jwt, k=key", 7200);

        assertThat(status).isEqualTo(201);
        assertThat(seenMethod.get()).isEqualTo("POST");
        assertThat(seenBody.get()).isEqualTo(body);
        var headers = seenHeaders.get();
        assertThat(headers.getFirst("Authorization")).isEqualTo("vapid t=jwt, k=key");
        assertThat(headers.getFirst("TTL")).isEqualTo("7200");
        assertThat(headers.getFirst("Content-Encoding")).isEqualTo("aes128gcm");
        assertThat(headers.getFirst("Content-Type")).isEqualTo("application/octet-stream");
        assertThat(headers.getFirst("Urgency")).isEqualTo("normal");
    }

    @Test
    void returnsWhateverStatusThePushServiceAnswers() {
        for (int status : new int[] {201, 404, 410, 413, 429, 500}) {
            answer = status;
            assertThat(new HttpPushGateway().send(endpoint(), new byte[] {1}, "vapid", 60)).isEqualTo(status);
        }
    }

    @Test
    void failsWhenThePushServiceCannotBeReached() {
        int port = server.getAddress().getPort();
        server.stop(0);

        assertThatThrownBy(() -> new HttpPushGateway().send("http://127.0.0.1:" + port + "/push/x", new byte[] {1}, "vapid", 60))
                .isInstanceOf(IllegalStateException.class);
    }
}
