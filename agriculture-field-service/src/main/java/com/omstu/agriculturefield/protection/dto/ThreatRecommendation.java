package com.omstu.agriculturefield.protection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ThreatRecommendation(
        @JsonProperty("product_name")        String productName,
        @JsonProperty("frac_code")           String fracCode,
        @JsonProperty("frac_group")          String fracGroup,
        @JsonProperty("active_ingredients")  String activeIngredients,
        @JsonProperty("dose_rate")           String doseRate,
        @JsonProperty("dose_value")          Double doseValue,
        @JsonProperty("dose_unit")           String doseUnit,
        @JsonProperty("bbch_from")           Integer bbchFrom,
        @JsonProperty("bbch_to")             Integer bbchTo,
        @JsonProperty("temp_min_c")          Double tempMinC,
        @JsonProperty("temp_max_c")          Double tempMaxC,
        @JsonProperty("phi_days")            Integer phiDays,
        @JsonProperty("rationale")           String rationale,
        @JsonProperty("disease_name")        String diseaseName) {
}
