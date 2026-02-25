package com.omstu.agriculturefield.rotation.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record SoilCropRecommendationRequest(
        // NPK в кг/га — не могут быть отрицательными
        @DecimalMin("0.0") Double N,
        @DecimalMin("0.0") Double P,
        @DecimalMin("0.0") Double K,
        Double temperature,
        // влажность в процентах
        @DecimalMin("0.0") @DecimalMax("100.0") Double humidity,
        // pH почвы
        @DecimalMin("0.0") @DecimalMax("14.0") Double ph,
        @DecimalMin("0.0") Double rainfall
) {}
