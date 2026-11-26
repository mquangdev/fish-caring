package com.fishcaring.controller;

import com.fishcaring.dto.TodayResponse;
import com.fishcaring.service.CurrentUser;
import com.fishcaring.service.TodayService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/today")
public class    TodayController {

    private final TodayService todayService;
    private final CurrentUser currentUser;

    public TodayController(TodayService todayService, CurrentUser currentUser) {
        this.todayService = todayService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public TodayResponse today() {
        return todayService.today(currentUser.id());
    }
}
