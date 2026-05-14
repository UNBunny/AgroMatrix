package com.omstu.agriculturefield.rotation.dto;

import com.omstu.agriculturefield.rotation.model.enums.RotationRecommendation;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CropRotationRuleRequest(
        @NotNull Long predecessorCropId,
        @NotNull Long successorCropId,
        @NotNull Boolean allowed,
        @Min(0) Integer minGapYears,
        String reason,
        RotationRecommendation recommendation,
        String diseaseRisk,
        String weedRisk,
        String soilStructureImpact,
        String nitrogenBalance,
        String requiredPractices
) {}