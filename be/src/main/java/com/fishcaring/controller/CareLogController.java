package com.fishcaring.controller;

import com.fishcaring.dto.CareLogResponse;
import com.fishcaring.service.CareLogService;
import com.fishcaring.service.CurrentUser;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CareLogController {

    private final CareLogService logService;
    private final CurrentUser currentUser;

    public CareLogController(CareLogService logService, CurrentUser currentUser) {
        this.logService = logService;
        this.currentUser = currentUser;
    }

    @GetMapping("/api/tanks/{tankId}/logs")
    public List<CareLogResponse> tankLogs(@PathVariable long tankId, @RequestParam(required = false) Integer limit) {
        return logService.tankLogs(currentUser.id(), tankId, limit);
    }

    /** Logs of the tasks that belong to no tank. */
    @GetMapping("/api/tasks/general/logs")
    public List<CareLogResponse> generalLogs(@RequestParam(required = false) Integer limit) {
        return logService.generalLogs(currentUser.id(), limit);
    }
}
