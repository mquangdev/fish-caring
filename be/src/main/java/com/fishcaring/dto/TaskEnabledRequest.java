package com.fishcaring.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Body of {@code PATCH /api/tasks/{id}/enabled}. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TaskEnabledRequest {

    @NotNull
    private Boolean enabled;
}
