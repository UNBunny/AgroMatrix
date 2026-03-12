package com.omstu.weatherservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Конфигурация параметров для Open-Meteo API
 */
@Component
@ConfigurationProperties(prefix = "weather.api")
@Getter
@Setter
public class WeatherApiProperties {

    private String forecastBaseUrl;
    private String historicalBaseUrl;
    private int maxInMemorySize;

    // Минимальная дата для исторических данных (API ограничение)
    private LocalDate minHistoricalDate = LocalDate.of(1990, 1, 1);

    // Максимальная дата для исторических данных (текущая дата - 5 дней)
    private int historicalDataLagDays;

    // Порог для разбиения на несколько запросов (в месяцах)
    private int longPeriodThresholdMonths;

    public LocalDate getMaxHistoricalDate() {
        return LocalDate.now().minusDays(historicalDataLagDays);
    }
}

