package com.omstu.agriculturefield.report.dto;

import com.omstu.agriculturefield.report.model.enums.PlanStatus;

import java.time.LocalDateTime;

public record SeasonPlanResponse(
        Long id,
        Long fieldId,
        String fieldName,
        String cropType,
        String season,
        String description,
        PlanStatus status,
        Long createdByUserId,
        String createdByUsername,
        Long reviewedByUserId,
        String reviewedByUsername,
        String reviewComment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
