package com.omstu.agriculturefield.disease.dto;

// зеркало ForecastWindowResponse из weather-service
public record ForecastWindowData(
        Double tempMean7d,
        Double tempMax7d,
        Double tempMin7d,
        Double humidity7d,
        Double precip7d,
        Double precip14d,
        Double windSpeedMean7d
) {}

