package com.omstu.weatherservice.dto;

public record AgrometricalData(
        Double gtk,
        Double sumPrecipitation,
        Double sumEffectiveTemp,
        Integer heatStressDays,
        double minTempRecord,
        String stressLevel,
        Double avgTemp,
        Integer extremeHeatDays,
        Integer longestDryPeriod,
        Double avgHumidity
) {}
