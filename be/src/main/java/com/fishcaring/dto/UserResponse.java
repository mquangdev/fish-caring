package com.fishcaring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** Public view of a user. Never contains the password hash. */
@Getter
@AllArgsConstructor
@Builder
public class UserResponse {

    private final Long id;
    private final String email;
    private final String displayName;
}
