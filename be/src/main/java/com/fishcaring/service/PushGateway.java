package com.fishcaring.service;

/** Sends one encrypted Web Push message to a push service. */
public interface PushGateway {

    /**
     * POSTs the body to the endpoint and returns the HTTP status of the push service (201 means accepted,
     * 404 and 410 mean the subscription is gone). Throws when the push service cannot be reached.
     */
    int send(String endpoint, byte[] body, String authorization, int ttlSeconds);
}
