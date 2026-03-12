package com.omstu.weatherservice.validation;

import com.omstu.weatherservice.config.WeatherApiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@Component
@RequiredArgsConstructor
@Slf4j
public class DateValidator {

    private final WeatherApiProperties properties;

    public void validateHistoricalPeriod(String startDate, String endDate) {
        if (startDate == null || endDate == null) {
            log.error("Dates cannot be null: startDate={}, endDate={}", startDate, endDate);
            throw new IllegalArgumentException("Start date and end date are required for historical data");
        }

        LocalDate start;
        LocalDate end;

        try {
            start = LocalDate.parse(startDate);
            end = LocalDate.parse(endDate);
        } catch (DateTimeParseException e) {
            log.error("Invalid date format: startDate={}, endDate={}", startDate, endDate, e);
            throw new IllegalArgumentException("Dates must be in ISO format (yyyy-MM-dd)", e);
        }

        validateDateOrder(start, end);
        validateHistoricalDateBounds(start, end);
    }

    public void validateForecastDays(Integer days) {
        if (days == null || days <= 0) {
            log.error("Invalid forecast days: {}", days);
            throw new IllegalArgumentException("Forecast days must be positive");
        }

        if (days > 16) {
            log.warn("Requested {} forecast days, but API supports maximum 16 days", days);
            throw new IllegalArgumentException("Forecast days cannot exceed 16");
        }
    }

    public void validateCoordinates(Double lat, Double lon) {
        if (lat == null || lon == null) {
            log.error("Coordinates cannot be null: lat={}, lon={}", lat, lon);
            throw new IllegalArgumentException("Latitude and longitude are required");
        }

        if (lat < -90 || lat > 90) {
            log.error("Invalid latitude: {}", lat);
            throw new IllegalArgumentException("Latitude must be between -90 and 90");
        }

        if (lon < -180 || lon > 180) {
            log.error("Invalid longitude: {}", lon);
            throw new IllegalArgumentException("Longitude must be between -180 and 180");
        }
    }

    private void validateDateOrder(LocalDate start, LocalDate end) {
        if (start.isAfter(end)) {
            log.error("Start date {} is after end date {}", start, end);
            throw new IllegalArgumentException("Start date must be before or equal to end date");
        }
    }

    private void validateHistoricalDateBounds(LocalDate start, LocalDate end) {
        LocalDate minDate = properties.getMinHistoricalDate();
        LocalDate maxDate = properties.getMaxHistoricalDate();

        if (start.isBefore(minDate)) {
            log.warn("Requested start date {} is before minimum allowed date {}", start, minDate);
            throw new IllegalArgumentException(
                    String.format("Historical data is only available from %s onwards", minDate));
        }

        if (end.isAfter(maxDate)) {
            log.warn("Requested end date {} is after maximum allowed date {}", end, maxDate);
            throw new IllegalArgumentException(
                    String.format("Historical data is only available until %s (current date - %d days)",
                            maxDate, properties.getHistoricalDataLagDays()));
        }

        if (start.isAfter(LocalDate.now())) {
            log.error("Start date {} is in the future", start);
            throw new IllegalArgumentException("Historical data cannot be requested for future dates");
        }
    }
}

