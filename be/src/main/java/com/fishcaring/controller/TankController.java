package com.fishcaring.controller;

import com.fishcaring.dto.TankRequest;
import com.fishcaring.dto.TankResponse;
import com.fishcaring.dto.TankSummaryResponse;
import com.fishcaring.service.CurrentUser;
import com.fishcaring.service.TankService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tanks")
public class TankController {

    private final TankService tankService;
    private final CurrentUser currentUser;

    public TankController(TankService tankService, CurrentUser currentUser) {
        this.tankService = tankService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<TankSummaryResponse> list() {
        return tankService.list(currentUser.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TankResponse create(@Valid @RequestBody TankRequest request) {
        return tankService.create(currentUser.id(), request);
    }

    @GetMapping("/{id}")
    public TankResponse get(@PathVariable long id) {
        return tankService.get(currentUser.id(), id);
    }

    @PutMapping("/{id}")
    public TankResponse update(@PathVariable long id, @Valid @RequestBody TankRequest request) {
        return tankService.update(currentUser.id(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        tankService.delete(currentUser.id(), id);
    }
}
