package com.fishcaring.exception;

import java.util.Map;
import lombok.Getter;

/**
 * Input that is well formed but breaks a rule Bean Validation cannot express, for example only some
 * of a tank's dimensions being given (HTTP 400 {@code VALIDATION_ERROR} with per-field messages).
 */
@Getter
public class ValidationException extends RuntimeException {

    private final transient Map<String, String> fieldErrors;

    public ValidationException(Map<String, String> fieldErrors) {
        super("Invalid input");
        this.fieldErrors = Map.copyOf(fieldErrors);
    }
}
