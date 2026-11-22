package com.fishcaring.controller;

import com.fishcaring.dto.TaskEnabledRequest;
import com.fishcaring.dto.TaskRequest;
import com.fishcaring.dto.TaskResponse;
import com.fishcaring.service.CareTaskService;
import com.fishcaring.service.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class CareTaskController {

    private final CareTaskService taskService;
    private final CurrentUser currentUser;

    public CareTaskController(CareTaskService taskService, CurrentUser currentUser) {
        this.taskService = taskService;
        this.currentUser = currentUser;
    }

    /** The user's tasks that belong to no tank. */
    @GetMapping("/general")
    public List<TaskResponse> listGeneral() {
        return taskService.listGeneral(currentUser.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@Valid @RequestBody TaskRequest request) {
        return taskService.create(currentUser.id(), request);
    }

    @GetMapping("/{taskId}")
    public TaskResponse get(@PathVariable long taskId) {
        return taskService.get(currentUser.id(), taskId);
    }

    @PutMapping("/{taskId}")
    public TaskResponse update(@PathVariable long taskId, @Valid @RequestBody TaskRequest request) {
        return taskService.update(currentUser.id(), taskId, request);
    }

    @PatchMapping("/{taskId}/enabled")
    public TaskResponse setEnabled(@PathVariable long taskId, @Valid @RequestBody TaskEnabledRequest request) {
        return taskService.setEnabled(currentUser.id(), taskId, request.getEnabled());
    }

    @PostMapping("/{taskId}/complete")
    public TaskResponse complete(@PathVariable long taskId) {
        return taskService.complete(currentUser.id(), taskId);
    }

    @PostMapping("/{taskId}/snooze")
    public TaskResponse snooze(@PathVariable long taskId) {
        return taskService.snooze(currentUser.id(), taskId);
    }

    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long taskId) {
        taskService.delete(currentUser.id(), taskId);
    }
}
