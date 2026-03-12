package com.omstu.weatherservice.dto;

/**
 * Агрегированные показатели прогноза за скользящее окно (7/14 дней).
 * Используется для оценки риска болезней растений.
 */
public record ForecastWindowResponse(
        Double tempMean7d,
        Double tempMax7d,
        Double tempMin7d,
        Double humidity7d,
        Double precip7d,
        Double precip14d,
        Double windSpeedMean7d
) {}
