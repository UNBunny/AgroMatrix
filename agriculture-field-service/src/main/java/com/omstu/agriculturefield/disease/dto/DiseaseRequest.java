package com.omstu.agriculturefield.disease.dto;

import com.omstu.agriculturefield.disease.model.enums.DiseaseType;
import com.omstu.agriculturefield.disease.model.enums.RiskLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record DiseaseRequest(
        String scientificName,
        @NotBlank String commonName,
        @NotNull DiseaseType diseaseType,
        Set<Long> affectedCropIds,
        String symptoms,
        String preventionMeasures,
        String treatmentMethods,
        @NotNull RiskLevel riskLevel,
        String activeSeason,
        String favorableConditions,
        String imageUrl,
        @NotNull Boolean isActive
) {}
