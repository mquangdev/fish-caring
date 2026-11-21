package com.fishcaring.controller;

import com.fishcaring.dto.UpdateProfileRequest;
import com.fishcaring.dto.UserResponse;
import com.fishcaring.service.CurrentUser;
import com.fishcaring.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final UserService userService;
    private final CurrentUser currentUser;

    public MeController(UserService userService, CurrentUser currentUser) {
        this.userService = userService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public UserResponse me() {
        return userService.getMe(currentUser.id());
    }

    @PatchMapping
    public UserResponse updateMe(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateDisplayName(currentUser.id(), request.getDisplayName());
    }
}
