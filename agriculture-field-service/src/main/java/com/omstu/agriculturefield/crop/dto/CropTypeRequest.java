package com.omstu.agriculturefield.crop.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CropTypeRequest(
        @NotBlank String name,
        @NotBlank String category,
        @Positive Integer growingSeasonDays,
        BigDecimal optimalTemperatureMin,
        BigDecimal optimalTemperatureMax,
        @DecimalMin("0.0") BigDecimal waterRequirementsMm,
        String notes,
        String mlCropCode
) {}
