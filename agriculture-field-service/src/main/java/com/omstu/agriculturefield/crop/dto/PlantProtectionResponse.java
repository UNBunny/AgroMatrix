package com.omstu.agriculturefield.crop.dto;

import com.omstu.agriculturefield.crop.model.enums.InfestationLevel;
import com.omstu.agriculturefield.crop.model.enums.ProtectionOperationType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PlantProtectionResponse(
        Long id,
        Long cropHistoryId,
        String cropTypeName,
        String fieldName,
        LocalDate operationDate,
        ProtectionOperationType operationType,
        String productName,
        String activeIngredient,
        String mechanismOfAction,
        Double doseLPerHa,
        Double concentrationPercent,
        String targetPest,
        InfestationLevel infestationLevel,
        Integer bbchPhase,
        Double tempC,
        Integer humidity,
        Double windSpeed,
        Boolean precipitationExpected,
        Integer efficacyPercent,
        Boolean followUpRequired,
        Integer phiDays,
        LocalDate harvestAllowedAfter,
        BigDecimal costPerHa,
        String notes,
        LocalDateTime createdAt
) {}
