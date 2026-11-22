package com.fishcaring.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

/** {@code due}: due now or overdue, oldest first. {@code upcoming}: still to come later today. */
@Getter
@AllArgsConstructor
public class TodayResponse {

    private final List<TodayItemResponse> due;
    private final List<TodayItemResponse> upcoming;
}
