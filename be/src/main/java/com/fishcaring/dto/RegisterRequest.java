package com.fishcaring.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body of {@code POST /api/auth/register}. Request DTOs have setters so JSON can be bound. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    // BCrypt only uses the first 72 bytes, so longer passwords are rejected.
    @NotBlank
    @Size(min = 8, max = 72)
    private String password;

    @NotBlank
    @Size(max = 100)
    private String displayName;
}
