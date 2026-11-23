package com.fishcaring.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body of {@code POST /api/push/subscribe}: the {@code PushSubscription} of the browser as JSON. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PushSubscribeRequest {

    @NotBlank
    @Size(max = 512)
    private String endpoint;

    @NotNull
    @Valid
    private Keys keys;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Keys {

        @NotBlank
        @Size(max = 200)
        private String p256dh;

        @NotBlank
        @Size(max = 100)
        private String auth;
    }
}
