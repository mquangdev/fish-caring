package com.fishcaring.service;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.function.Function;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Protects the server from being used to reach internal addresses: a push endpoint is a URL the user
 * sends and the server later calls. Only https on the default port to a public host name is accepted.
 */
@Component
public class PushEndpointValidator {

    public static final int MAX_LENGTH = 512;
    private static final Pattern IPV4 = Pattern.compile("^[0-9.]+$");

    private final Function<String, List<InetAddress>> resolver;

    public PushEndpointValidator() {
        this(PushEndpointValidator::resolve);
    }

    /** The resolver is given by the tests so they need no network. */
    public PushEndpointValidator(Function<String, List<InetAddress>> resolver) {
        this.resolver = resolver;
    }

    /** Empty when the endpoint may be used, otherwise the reason (English, for the API message). */
    public Optional<String> problem(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) {
            return Optional.of("must not be empty");
        }
        if (endpoint.length() > MAX_LENGTH) {
            return Optional.of("must be at most " + MAX_LENGTH + " characters");
        }
        URI uri;
        try {
            uri = URI.create(endpoint);
        } catch (IllegalArgumentException e) {
            return Optional.of("must be a valid URL");
        }
        if (!"https".equals(uri.getScheme())) {
            return Optional.of("must use https");
        }
        if (uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)) {
            return Optional.of("must not contain credentials or a custom port");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            return Optional.of("must have a host");
        }
        String lower = host.toLowerCase(Locale.ROOT);
        if (isIpLiteral(lower) || lower.equals("localhost") || lower.endsWith(".localhost")
                || lower.endsWith(".local") || lower.endsWith(".internal") || !lower.contains(".")) {
            return Optional.of("must be a public host name");
        }
        List<InetAddress> addresses = resolver.apply(lower);
        if (addresses.isEmpty()) {
            return Optional.of("host cannot be resolved");
        }
        if (addresses.stream().anyMatch(PushEndpointValidator::isInternal)) {
            return Optional.of("must not point to a private address");
        }
        return Optional.empty();
    }

    private static boolean isIpLiteral(String host) {
        return host.startsWith("[") || host.contains(":") || IPV4.matcher(host).matches();
    }

    private static boolean isInternal(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) {
            return true;
        }
        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int first = bytes[0] & 0xff;
            int second = bytes[1] & 0xff;
            return first == 0 || (first == 100 && second >= 64 && second <= 127);
        }
        // IPv6 unique local addresses (fc00::/7)
        return (bytes[0] & 0xfe) == 0xfc;
    }

    private static List<InetAddress> resolve(String host) {
        try {
            return List.of(InetAddress.getAllByName(host));
        } catch (UnknownHostException e) {
            return List.of();
        }
    }
}
