package com.omstu.agriculturefield.field.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AgriculturalFieldResponse(
        Long id,
        String fieldName,
        @JsonProperty("crop_type") String cropType,
        String status,
        List<List<Double>> coordinates,
        List<List<List<Double>>> holes,
        Double areaHectares,
        String regionCode,
        String regionName
) {}
