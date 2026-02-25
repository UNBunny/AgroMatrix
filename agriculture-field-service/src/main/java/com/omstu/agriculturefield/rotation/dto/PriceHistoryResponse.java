package com.omstu.agriculturefield.rotation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PriceHistoryResponse(
        String region,
        String crop,
        @JsonProperty("last_year") int lastYear,
        @JsonProperty("last_month") int lastMonth,
        @JsonProperty("price_lag1") Double priceLag1,
        @JsonProperty("price_lag12") Double priceLag12,
        @JsonProperty("price_lag24") Double priceLag24,
        @JsonProperty("price_ma3") Double priceMa3,
        @JsonProperty("price_ma12") Double priceMa12,
        @JsonProperty("price_mom") Double priceMom,
        @JsonProperty("price_yoy") Double priceYoy,
        boolean found
) {}
