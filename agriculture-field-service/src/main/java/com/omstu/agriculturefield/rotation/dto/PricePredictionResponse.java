package com.omstu.agriculturefield.rotation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PricePredictionResponse(
        String region,
        String crop,
        int year,
        int month,
        @JsonProperty("predicted_price_rub_per_ton") Double predictedPriceRubPerTon,
        @JsonProperty("model_version") String modelVersion
) {
    public Double predictedPrice() {
        return predictedPriceRubPerTon;
    }
}
