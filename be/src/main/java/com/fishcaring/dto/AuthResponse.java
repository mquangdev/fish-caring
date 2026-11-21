package com.fishcaring.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Result of register and login: the access token plus the user it belongs to. */
@Getter
@AllArgsConstructor
public class AuthResponse {

    private final String token;
    private final UserResponse user;
}
