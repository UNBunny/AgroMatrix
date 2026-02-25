package com.omstu.agriculturefield.disease.dto;

// зеркало AgrometricalData из weather-service
public record WeatherForecastData(
        Double gtk,
        Double sumPrecipitation,
        Double sumEffectiveTemp,
        Integer heatStressDays,
        Double minTempRecord,
        String stressLevel,
        Double avgTemp,
        Integer extremeHeatDays,
        Integer longestDryPeriod,
        Double avgHumidity
) {}

