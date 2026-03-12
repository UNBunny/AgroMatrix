package com.omstu.weatherservice.controller;

import com.omstu.weatherservice.dto.AgrometricalData;
import com.omstu.weatherservice.dto.SeasonalAgrometricsResponse;
import com.omstu.weatherservice.service.AgroMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/agro-data")
@RequiredArgsConstructor
@Slf4j
public class AgroMetricsController {

    private final AgroMetricsService agroMetricsService;

    @GetMapping("/metrics")
    public Mono<ResponseEntity<AgrometricalData>> getHistoricalMetrics(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam("start_date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String startDate,
            @RequestParam("end_date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String endDate
    ) {
        log.info("Received historical agro metrics request: lat={}, lon={}, period={} to {}", 
                lat, lon, startDate, endDate);

        return agroMetricsService.calculateHistoricalMetrics(lat, lon, startDate, endDate)
                .map(ResponseEntity::ok)
                .doOnSuccess(response -> log.info("Historical agro metrics request completed successfully"))
                .onErrorResume(e -> {
                    log.error("Historical agro metrics request failed: {}", e.getMessage());
                    return Mono.just(ResponseEntity.badRequest().build());
                });
    }

    @GetMapping("/forecast")
    public Mono<ResponseEntity<AgrometricalData>> getForecastMetrics(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam Integer days
    ) {
        log.info("Received forecast agro metrics request: lat={}, lon={}, days={}", 
                lat, lon, days);

        return agroMetricsService.calculateForecastMetrics(lat, lon, days)
                .map(ResponseEntity::ok)
                .doOnSuccess(response -> log.info("Forecast agro metrics request completed successfully"))
                .onErrorResume(e -> {
                    log.error("Forecast agro metrics request failed: {}", e.getMessage());
                    return Mono.just(ResponseEntity.badRequest().build());
                });
    }

    @GetMapping("/next-season")
    public Mono<ResponseEntity<AgrometricalData>> getNextSeasonMetrics(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam("crop_start") String cropStartDate,
            @RequestParam("duration") Integer durationDays
    ) {
        log.info("Received next season agro metrics request: lat={}, lon={}, cropStart={}, duration={} days",
                lat, lon, cropStartDate, durationDays);

        return agroMetricsService.calculateAveragedMetrics(lat, lon, cropStartDate, durationDays, 1)
                .map(ResponseEntity::ok)
                .doOnSuccess(response -> log.info("Next season agro metrics request completed successfully"))
                .onErrorResume(e -> {
                    log.error("Next season agro metrics request failed: {}", e.getMessage());
                    return Mono.just(ResponseEntity.badRequest().build());
                });
    }

    @GetMapping("/next-season-average")
    public Mono<ResponseEntity<AgrometricalData>> getNextSeasonAverageMetrics(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam("crop_start") String cropStartDate,
            @RequestParam("duration") Integer durationDays,
            @RequestParam(value = "years", defaultValue = "3") Integer yearsCount
    ) {
        log.info("Received averaged next season agro metrics request: lat={}, lon={}, cropStart={}, duration={} days, years={}",
                lat, lon, cropStartDate, durationDays, yearsCount);

        return agroMetricsService.calculateAveragedMetrics(lat, lon, cropStartDate, durationDays, yearsCount)
                .map(ResponseEntity::ok)
                .doOnSuccess(response -> log.info("Averaged next season metrics request completed successfully"))
                .onErrorResume(e -> {
                    log.error("Averaged next season metrics request failed: {}", e.getMessage());
                    return Mono.just(ResponseEntity.badRequest().build());
                });
    }

    @GetMapping("/seasonal")
    public Mono<ResponseEntity<SeasonalAgrometricsResponse>> getSeasonalMetrics(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam Integer year
    ) {
        log.info("Received seasonal agro metrics request: lat={}, lon={}, year={}", lat, lon, year);

        return agroMetricsService.calculateSeasonalMetrics(lat, lon, year)
                .map(ResponseEntity::ok)
                .doOnSuccess(response -> log.info("Seasonal agro metrics request completed successfully for year {}", year))
                .onErrorResume(e -> {
                    log.error("Seasonal agro metrics request failed: {}", e.getMessage());
                    return Mono.just(ResponseEntity.badRequest().build());
                });
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleValidationException(IllegalArgumentException e) {
        log.warn("Validation error: {}", e.getMessage());
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}

