package com.omstu.agriculturefield.field.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AgriculturalFieldRequest(
        @NotBlank String fieldName,
        @JsonProperty("crop_type") String cropType,
        String status,
        @NotEmpty @Size(min = 4) List<List<Double>> coordinates,
        List<List<List<Double>>> holes,
        @DecimalMin("0.0") Double areaHectares,
        String regionCode,
        String regionName,
        Long farmId
) {}
