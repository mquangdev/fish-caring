package com.fishcaring.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** Single error body returned by every failing API call. */
@Getter
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ApiError {

    private final String code;
    private final String message;
    private final Map<String, String> fieldErrors;

    public static ApiError of(String code, String message) {
        return new ApiError(code, message, Map.of());
    }
}
