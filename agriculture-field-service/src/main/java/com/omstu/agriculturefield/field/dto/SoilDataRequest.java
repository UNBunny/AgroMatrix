package com.omstu.agriculturefield.field.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record SoilDataRequest(
        @DecimalMin("0.0") Double nitrogenN,
        @DecimalMin("0.0") Double phosphorusP,
        @DecimalMin("0.0") Double potassiumK,
        @DecimalMin("0.0") @DecimalMax("14.0") Double phLevel,
        @DecimalMin("0.0") Double organicMatter,
        String soilTexture,
        @DecimalMin("0.0") Double cec,
        @DecimalMin("0.0") Double bulkDensity,
        String notes
) {}
