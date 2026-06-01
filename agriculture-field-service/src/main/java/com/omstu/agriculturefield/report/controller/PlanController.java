package com.omstu.agriculturefield.report.controller;

import com.omstu.agriculturefield.report.dto.PlanReviewRequest;
import com.omstu.agriculturefield.report.dto.SeasonPlanRequest;
import com.omstu.agriculturefield.report.dto.SeasonPlanResponse;
import com.omstu.agriculturefield.report.model.enums.PlanStatus;
import com.omstu.agriculturefield.report.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/plans")
@RequiredArgsConstructor
@Slf4j
public class PlanController {

    private final PlanService planService;

    @GetMapping
    public List<SeasonPlanResponse> getPlans(
            @RequestParam(required = false) PlanStatus status,
            @RequestParam(required = false) Long fieldId,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId
    ) {
        log.info("Get plans: farmId={}, status={}", farmId, status);
        return planService.getPlans(farmId, status, fieldId);
    }

    @GetMapping("/{id}")
    public SeasonPlanResponse getPlanById(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId
    ) {
        return planService.getPlanById(id, farmId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SeasonPlanResponse createPlan(
            @Valid @RequestBody SeasonPlanRequest request,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId,
            @RequestHeader(value = "X-Auth-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-Auth-User", required = false) String username
    ) {
        log.info("Create plan: farmId={}, userId={}, username={}", farmId, userId, username);
        return planService.createPlan(request, farmId,
                userId != null ? userId : 0L,
                username != null ? username : "unknown");
    }

    @PatchMapping("/{id}/submit")
    public SeasonPlanResponse submitForApproval(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId,
            @RequestHeader(value = "X-Auth-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-Auth-User", required = false) String username,
            @RequestHeader(value = "X-Auth-Role", required = false) String role
    ) {
        log.info("Submit plan {} for approval by userId={}, role={}", id, userId, role);
        return planService.submitForApproval(id, farmId,
                userId != null ? userId : 0L,
                username != null ? username : "unknown",
                role);
    }

    @PatchMapping("/{id}/review")
    public SeasonPlanResponse reviewPlan(
            @PathVariable Long id,
            @Valid @RequestBody PlanReviewRequest request,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId,
            @RequestHeader(value = "X-Auth-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-Auth-User", required = false) String username,
            @RequestHeader(value = "X-Auth-Role", required = false) String role
    ) {
        log.info("Review plan {} as {}: status={}, userId={}", id, role, request.status(), userId);
        return planService.reviewPlan(id, request, farmId,
                userId != null ? userId : 0L,
                username != null ? username : "unknown",
                role);
    }
}
