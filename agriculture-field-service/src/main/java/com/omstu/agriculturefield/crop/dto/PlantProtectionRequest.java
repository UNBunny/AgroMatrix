package com.omstu.agriculturefield.crop.dto;

import com.omstu.agriculturefield.crop.model.enums.InfestationLevel;
import com.omstu.agriculturefield.crop.model.enums.ProtectionOperationType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PlantProtectionRequest(
        @NotNull Long cropHistoryId,
        @NotNull LocalDate operationDate,
        @NotNull ProtectionOperationType operationType,
        @NotBlank String productName,
        String activeIngredient,
        String mechanismOfAction,
        @PositiveOrZero Double doseLPerHa,
        // концентрация в %
        @DecimalMin("0.0") @Max(100) Double concentrationPercent,
        String targetPest,
        InfestationLevel infestationLevel,
        @Min(0) @Max(99) Integer bbchPhase,
        Double tempC,
        @Min(0) @Max(100) Integer humidity,
        @PositiveOrZero Double windSpeed,
        Boolean precipitationExpected,
        @Min(0) @Max(100) Integer efficacyPercent,
        Boolean followUpRequired,
        // срок ожидания до уборки в днях
        @PositiveOrZero Integer phiDays,
        LocalDate harvestAllowedAfter,
        @DecimalMin("0.0") BigDecimal costPerHa,
        String notes
) {}
