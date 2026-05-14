package com.omstu.agriculturefield.crop.dto;

import com.omstu.agriculturefield.crop.model.enums.ApplicationMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record FertilizerApplicationResponse(
        Long id,
        Long cropHistoryId,
        String cropTypeName,
        String fieldName,
        LocalDate applicationDate,
        String fertilizerType,
        String formulation,
        Double doseKgPerHa,
        Double totalAreaHa,
        Double totalAmountKg,
        ApplicationMethod applicationMethod,
        Integer bbchPhase,
        BigDecimal costPerHa,
        BigDecimal totalCost,
        Double weatherTempC,
        Integer weatherHumidity,
        Double windSpeed,
        String notes,
        LocalDateTime createdAt
) {}
