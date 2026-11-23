package com.fishcaring.controller;

import com.fishcaring.dto.PushPublicKeyResponse;
import com.fishcaring.dto.PushSubscribeRequest;
import com.fishcaring.dto.PushUnsubscribeRequest;
import com.fishcaring.service.CurrentUser;
import com.fishcaring.service.PushSubscriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushSubscriptionService pushService;
    private final CurrentUser currentUser;

    public PushController(PushSubscriptionService pushService, CurrentUser currentUser) {
        this.pushService = pushService;
        this.currentUser = currentUser;
    }

    @GetMapping("/public-key")
    public PushPublicKeyResponse publicKey() {
        return new PushPublicKeyResponse(pushService.publicKey());
    }

    @PostMapping("/subscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void subscribe(@Valid @RequestBody PushSubscribeRequest request,
                          @RequestHeader(value = "User-Agent", required = false) String userAgent) {
        pushService.subscribe(currentUser.id(), request, userAgent);
    }

    @DeleteMapping("/subscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(@Valid @RequestBody PushUnsubscribeRequest request) {
        pushService.unsubscribe(currentUser.id(), request.getEndpoint());
    }
}
