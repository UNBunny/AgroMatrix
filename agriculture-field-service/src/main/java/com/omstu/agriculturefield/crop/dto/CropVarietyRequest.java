package com.omstu.agriculturefield.crop.dto;

import com.omstu.agriculturefield.crop.model.enums.ToleranceLevel;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CropVarietyRequest(
        @NotBlank String name,
        @NotNull Long cropTypeId,
        String seedProducer,
        @Positive Integer maturationDays,
        ToleranceLevel droughtTolerance,
        ToleranceLevel frostTolerance,
        @DecimalMin("0.0") BigDecimal recommendedSeedingRateKgPerHa,
        @DecimalMin("0.0") BigDecimal seedCostPerKg,
        Boolean isHybrid,
        String notes
) {}
