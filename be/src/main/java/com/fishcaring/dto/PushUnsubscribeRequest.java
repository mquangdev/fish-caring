package com.fishcaring.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body of {@code DELETE /api/push/subscribe}. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PushUnsubscribeRequest {

    @NotBlank
    @Size(max = 512)
    private String endpoint;
}
