package com.omstu.agriculturefield.crop.dto;

import com.omstu.agriculturefield.crop.model.enums.PlantingStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.Date;

public record CropHistoryRequest(
        @NotNull Long fieldId,
        @NotNull Long cropTypeId,
        Long cropVarietyId,
        @NotNull Date plantingDate,
        Date actualHarvestDate,
        Date expectedHarvestDate,
        @DecimalMin("0.0") BigDecimal seedAmountKgPerHa,
        @DecimalMin("0.0") BigDecimal seedDepthCm,
        @DecimalMin("0.0") BigDecimal plantSpacingCm,
        @DecimalMin("0.0") BigDecimal actualYieldKg,
        @DecimalMin("0.0") BigDecimal expectedYieldKg,
        @NotNull PlantingStatus plantingStatus,
        String notes,
        String weatherConditions
) {}
