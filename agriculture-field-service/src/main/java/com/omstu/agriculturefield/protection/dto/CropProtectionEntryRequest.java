package com.omstu.agriculturefield.protection.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record CropProtectionEntryRequest(
        @NotBlank String cropCode,
        @NotBlank String diseaseName,
        String pathogenLatin,
        @NotBlank String diseaseType,
        @NotBlank String productName,
        String fracGroup,
        String fracCode,
        @NotBlank String activeIngredients,
        String aiConcentration,
        @NotBlank String applicationType,
        Integer bbchFrom,
        Integer bbchTo,
        String bbchNote,
        @NotBlank String doseRate,
        Double doseValue,
        String doseUnit,
        Double tempMinC,
        Double tempOptC,
        Double tempMaxC,
        @NotNull @PositiveOrZero Integer phiDays,
        String notes,
        @NotNull Boolean isActive) {
}
