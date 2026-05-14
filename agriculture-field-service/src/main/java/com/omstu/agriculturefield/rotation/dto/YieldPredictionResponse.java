package com.omstu.agriculturefield.rotation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record YieldPredictionResponse(
        @JsonProperty("region_code") String regionCode,
        String crop,
        int year,
        @JsonProperty("predicted_yield_centners_per_ha") Double predictedYieldCentnersPerHa,
        @JsonProperty("model_version") String modelVersion
) {
    public Double predictedYield() {
        return predictedYieldCentnersPerHa;
    }
}
