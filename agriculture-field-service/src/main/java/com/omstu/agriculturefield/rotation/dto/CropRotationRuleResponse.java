package com.omstu.agriculturefield.rotation.dto;

import com.omstu.agriculturefield.rotation.model.enums.RotationRecommendation;

public record CropRotationRuleResponse(
        Long id,
        Long predecessorCropId,
        String predecessorCropName,
        Long successorCropId,
        String successorCropName,
        Boolean allowed,
        Integer minGapYears,
        String reason,
        RotationRecommendation recommendation,
        Integer recommendationScore,
        String recommendationRationale,
        String diseaseRisk,
        String weedRisk,
        String soilStructureImpact,
        String nitrogenBalance,
        String requiredPractices
) {}