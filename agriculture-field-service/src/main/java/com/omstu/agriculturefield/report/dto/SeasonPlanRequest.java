package com.omstu.agriculturefield.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SeasonPlanRequest(
        @NotNull Long fieldId,
        @NotBlank String cropType,
        @NotBlank String season,
        String description
) {}
