package com.omstu.agriculturefield.protection.dto;

public record WeatherWindowDto(
        Double avgTemp48h,
        Double maxTemp48h,
        Double minTemp48h,
        Double avgHumidity48h,
        Double totalPrecip48h,
        Double leafWetnessDurationHours,
        Double forecastTemp24h,
        Double forecastHumidity24h,
        Double forecastPrecip24h,
        Boolean rainExpectedIn3h,
        Double forecastMaxTemp24h,
        String dataSource) {
}
