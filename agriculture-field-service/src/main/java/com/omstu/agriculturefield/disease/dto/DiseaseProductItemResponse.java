package com.omstu.agriculturefield.disease.dto;

public record DiseaseProductItemResponse(
        Long id,
        String name,
        String activeIngredient,
        String mechanism,
        String dose,
        Double doseValue,
        String timing,
        Integer phiDays
) {}
