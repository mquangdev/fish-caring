package com.fishcaring.exception;

/** The request conflicts with existing data, e.g. duplicate email (HTTP 409). */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
