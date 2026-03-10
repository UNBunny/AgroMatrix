package com.omstu.agriculturefield.protection.dto;

public record CropProtectionEntryDto(
        Long id,
        String cropCode,
        String diseaseName,
        String pathogenLatin,
        String diseaseType,
        String productName,
        String fracGroup,
        String fracCode,
        String activeIngredients,
        String aiConcentration,
        String applicationType,
        Integer bbchFrom,
        Integer bbchTo,
        String bbchNote,
        String doseRate,
        Double doseValue,
        String doseUnit,
        Double tempMinC,
        Double tempOptC,
        Double tempMaxC,
        Integer phiDays,
        String notes,
        Boolean isActive) {
}
