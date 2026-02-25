package com.omstu.agriculturefield.crop.dto;

import java.math.BigDecimal;

public record CropTypeResponse(
        Long id,
        String name,
        String category,
        Integer growingSeasonDays,
        BigDecimal optimalTemperatureMin,
        BigDecimal optimalTemperatureMax,
        BigDecimal waterRequirementsMm,
        String notes,
        String mlCropCode
) {}
