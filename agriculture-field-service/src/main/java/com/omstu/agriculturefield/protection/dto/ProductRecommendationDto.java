package com.omstu.agriculturefield.protection.dto;

public record ProductRecommendationDto(
        Long entryId,
        String diseaseName,
        String pathogenLatin,
        String diseaseType,
        String productName,
        String activeIngredients,
        String aiConcentration,
        String fracCode,
        String fracGroup,
        String doseRate,
        Double doseValue,
        String doseUnit,
        String applicationType,
        Integer bbchFrom,
        Integer bbchTo,
        Double tempMinC,
        Double tempOptC,
        Double tempMaxC,
        Integer phiDays,
        String filterRationale,
        boolean isOptimalTemp) {
}
