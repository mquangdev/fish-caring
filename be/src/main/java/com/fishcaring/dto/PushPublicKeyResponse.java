package com.fishcaring.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** The VAPID public key (base64url) the browser needs to subscribe. */
@Getter
@AllArgsConstructor
public class PushPublicKeyResponse {

    private final String publicKey;
}
