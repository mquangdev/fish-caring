package com.fishcaring.exception;

import lombok.Getter;

/** The caller is not authenticated or gave wrong credentials (HTTP 401). */
@Getter
public class UnauthorizedException extends RuntimeException {

    public static final String INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    public static final String UNAUTHORIZED = "UNAUTHORIZED";

    private final String code;

    private UnauthorizedException(String code, String message) {
        super(message);
        this.code = code;
    }

    /** Same error for an unknown email and a wrong password, so the email is not revealed. */
    public static UnauthorizedException invalidCredentials() {
        return new UnauthorizedException(INVALID_CREDENTIALS, "Invalid email or password");
    }

    public static UnauthorizedException unauthorized() {
        return new UnauthorizedException(UNAUTHORIZED, "Authentication is required");
    }
}
