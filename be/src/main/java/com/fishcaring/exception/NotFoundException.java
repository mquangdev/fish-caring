package com.fishcaring.exception;

/** The resource does not exist or does not belong to the current user (HTTP 404). */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
