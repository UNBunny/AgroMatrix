package com.omstu.agriculturefield.report.dto;

import com.omstu.agriculturefield.report.model.enums.PlanStatus;
import jakarta.validation.constraints.NotNull;

public record PlanReviewRequest(
        @NotNull PlanStatus status,
        String comment
) {}
