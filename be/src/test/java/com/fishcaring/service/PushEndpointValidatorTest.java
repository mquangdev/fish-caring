package com.fishcaring.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.InetAddress;
import java.util.List;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

class PushEndpointValidatorTest {

    private static InetAddress ip(int... bytes) throws Exception {
        byte[] raw = new byte[bytes.length];
        for (int i = 0; i < bytes.length; i++) {
            raw[i] = (byte) bytes[i];
        }
        return InetAddress.getByAddress(raw);
    }

    private static PushEndpointValidator resolvingTo(InetAddress... addresses) {
        Function<String, List<InetAddress>> resolver = host -> List.of(addresses);
        return new PushEndpointValidator(resolver);
    }

    private static PushEndpointValidator publicHost() throws Exception {
        return resolvingTo(ip(142, 250, 4, 95));
    }

    @Test
    void anHttpsEndpointOfAPublicHostIsAccepted() throws Exception {
        assertThat(publicHost().problem("https://fcm.googleapis.com/fcm/send/abc")).isEmpty();
        assertThat(publicHost().problem("https://updates.push.services.mozilla.com:443/wpush/v2/x")).isEmpty();
        assertThat(publicHost().problem("https://web.push.apple.com/QGx")).isEmpty();
    }

    @Test
    void nothingButHttpsIsAccepted() throws Exception {
        assertThat(publicHost().problem("http://fcm.googleapis.com/x")).contains("must use https");
        assertThat(publicHost().problem("ftp://fcm.googleapis.com/x")).contains("must use https");
        assertThat(publicHost().problem("//fcm.googleapis.com/x")).contains("must use https");
    }

    @Test
    void emptyBrokenOrTooLongEndpointsAreRejected() throws Exception {
        assertThat(publicHost().problem(null)).isPresent();
        assertThat(publicHost().problem("  ")).isPresent();
        assertThat(publicHost().problem("https://exa mple.com/x")).contains("must be a valid URL");
        assertThat(publicHost().problem("https://fcm.googleapis.com/" + "a".repeat(512))).isPresent();
    }

    @Test
    void ipAddressesAndLocalNamesAreRejectedWithoutLookingThemUp() throws Exception {
        PushEndpointValidator failIfAsked = new PushEndpointValidator(host -> {
            throw new AssertionError("must not resolve " + host);
        });

        for (String endpoint : List.of(
                "https://127.0.0.1/x", "https://10.0.0.5/x", "https://169.254.169.254/latest", "https://192.168.1.1/x",
                "https://[::1]/x", "https://[fd00::1]/x", "https://localhost/x", "https://app.localhost/x",
                "https://printer.local/x", "https://db.internal/x", "https://intranet/x", "https://2130706433/x")) {
            assertThat(failIfAsked.problem(endpoint)).as(endpoint).isPresent();
        }
    }

    @Test
    void aCustomPortOrCredentialsAreRejected() throws Exception {
        assertThat(publicHost().problem("https://fcm.googleapis.com:8443/x")).isPresent();
        assertThat(publicHost().problem("https://user:pass@fcm.googleapis.com/x")).isPresent();
    }

    @Test
    void aNameThatPointsToAnInternalAddressIsRejected() throws Exception {
        assertThat(resolvingTo(ip(127, 0, 0, 1)).problem("https://evil.example.com/x"))
                .contains("must not point to a private address");
        assertThat(resolvingTo(ip(10, 1, 2, 3)).problem("https://evil.example.com/x")).isPresent();
        assertThat(resolvingTo(ip(172, 16, 0, 1)).problem("https://evil.example.com/x")).isPresent();
        assertThat(resolvingTo(ip(192, 168, 0, 1)).problem("https://evil.example.com/x")).isPresent();
        assertThat(resolvingTo(ip(169, 254, 169, 254)).problem("https://evil.example.com/x")).isPresent();
        assertThat(resolvingTo(ip(100, 64, 0, 1)).problem("https://evil.example.com/x")).isPresent();
        assertThat(resolvingTo(ip(0, 0, 0, 0)).problem("https://evil.example.com/x")).isPresent();
        assertThat(resolvingTo(ip(0xfd, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)).problem("https://evil.example.com/x"))
                .isPresent();
    }

    @Test
    void oneInternalAddressAmongPublicOnesIsEnoughToReject() throws Exception {
        assertThat(resolvingTo(ip(142, 250, 4, 95), ip(10, 0, 0, 1)).problem("https://mixed.example.com/x")).isPresent();
    }

    @Test
    void aNameThatDoesNotResolveIsRejected() {
        assertThat(new PushEndpointValidator(host -> List.of()).problem("https://nowhere.example.com/x"))
                .contains("host cannot be resolved");
    }
}
