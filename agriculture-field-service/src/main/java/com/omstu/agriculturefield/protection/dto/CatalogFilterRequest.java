package com.omstu.agriculturefield.protection.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CatalogFilterRequest(
        @NotBlank String cropCode,
        @Min(0) @Max(99) Integer bbchStage,
        Double tempC,
        @DecimalMin("0.0") @DecimalMax("100.0") Double humidity,
        @DecimalMin("0.0") Double leafWetnessHours,
        String diseaseType,
        String mlRiskLevel,
        String mlPathogenName,
        @DecimalMin("0.0") @DecimalMax("1.0") Double mlInfectionIndex) {
}
