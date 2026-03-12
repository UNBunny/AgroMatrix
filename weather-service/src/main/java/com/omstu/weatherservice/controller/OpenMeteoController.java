package com.omstu.weatherservice.controller;

import com.omstu.weatherservice.dto.OpenMeteoResponse;
import com.omstu.weatherservice.dto.WeatherRequestType;
import com.omstu.weatherservice.service.impl.OpenMeteoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/open-meteo")
@RequiredArgsConstructor
@Slf4j
public class OpenMeteoController {

    private final OpenMeteoService openMeteoService;

    @GetMapping("/ml")
    public Mono<ResponseEntity<OpenMeteoResponse>> getForecast(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam Integer days
    ) {
        log.info("Received forecast request: lat={}, lon={}, days={}", lat, lon, days);

        return openMeteoService.getWeather(lat, lon, WeatherRequestType.FORECAST, days, null, null)
                .map(ResponseEntity::ok)
                .doOnSuccess(response -> log.info("Forecast request completed successfully"))
                .onErrorResume(e -> {
                    log.error("Forecast request failed: {}", e.getMessage());
                    return Mono.just(ResponseEntity.badRequest().build());
                });
    }

    @GetMapping("/ml/historic-data")
    public Mono<ResponseEntity<OpenMeteoResponse>> getHistoricalData(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam("start_date") String startDate,
            @RequestParam("end_date") String endDate
    ) {
        log.info("Received historical data request: lat={}, lon={}, period={} to {}",
                lat, lon, startDate, endDate);

        return openMeteoService.getWeather(lat, lon, WeatherRequestType.HISTORIC, null, startDate, endDate)
                .map(ResponseEntity::ok)
                .doOnSuccess(response -> log.info("Historical data request completed successfully"))
                .onErrorResume(e -> {
                    log.error("Historical data request failed: {}", e.getMessage());
                    return Mono.just(ResponseEntity.badRequest().build());
                });
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleValidationException(IllegalArgumentException e) {
        log.warn("Validation error: {}", e.getMessage());
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}
