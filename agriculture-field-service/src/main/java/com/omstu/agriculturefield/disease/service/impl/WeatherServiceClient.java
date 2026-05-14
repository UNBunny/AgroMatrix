package com.omstu.agriculturefield.disease.service.impl;

import com.omstu.agriculturefield.config.WeatherServiceProperties;
import com.omstu.agriculturefield.disease.dto.ForecastWindowData;
import com.omstu.agriculturefield.disease.dto.WeatherForecastData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;

// HTTP-клиент к Weather Service, retry при 5xx и таймаутах
@Service
@Slf4j
public class WeatherServiceClient {

    private final WebClient weatherWebClient;
    private final WeatherServiceProperties properties;

    public WeatherServiceClient(
            @Qualifier("weatherWebClient") WebClient weatherWebClient,
            WeatherServiceProperties properties
    ) {
        this.weatherWebClient = weatherWebClient;
        this.properties = properties;
    }

    public Mono<WeatherForecastData> getForecastMetrics(Double lat, Double lon, Integer days) {
        log.info("Запрос прогноза агрометрик: lat={}, lon={}, days={}", lat, lon, days);

        return weatherWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/agro-data/forecast")
                        .queryParam("lat", lat)
                        .queryParam("lon", lon)
                        .queryParam("days", days)
                        .build())
                .retrieve()
                .bodyToMono(WeatherForecastData.class)
                .doOnSuccess(data -> log.info("Прогноз агрометрик получен успешно: gtk={}, avgTemp={}",
                        data != null ? data.gtk() : "null",
                        data != null ? data.avgTemp() : "null"))
                .retryWhen(createRetrySpec("getForecastMetrics"))
                .onErrorResume(ex -> {
                    log.error("Не удалось получить прогноз агрометрик после всех попыток: {}", ex.getMessage());
                    return Mono.empty();
                });
    }

    public Mono<WeatherForecastData> getHistoricalMetrics(Double lat, Double lon, String startDate, String endDate) {
        log.info("Запрос исторических агрометрик: lat={}, lon={}, period={} — {}", lat, lon, startDate, endDate);

        return weatherWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/agro-data/metrics")
                        .queryParam("lat", lat)
                        .queryParam("lon", lon)
                        .queryParam("start_date", startDate)
                        .queryParam("end_date", endDate)
                        .build())
                .retrieve()
                .bodyToMono(WeatherForecastData.class)
                .doOnSuccess(data -> log.info("Исторические агрометрики получены: gtk={}", data != null ? data.gtk() : "null"))
                .retryWhen(createRetrySpec("getHistoricalMetrics"))
                .onErrorResume(ex -> {
                    log.error("Не удалось получить исторические агрометрики после всех попыток: {}", ex.getMessage());
                    return Mono.empty();
                });
    }

    public Mono<ForecastWindowData> getForecastWindow(Double lat, Double lon) {
        log.info("Запрос скользящего окна прогноза: lat={}, lon={}", lat, lon);

        return weatherWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/agro-data/forecast-window")
                        .queryParam("lat", lat)
                        .queryParam("lon", lon)
                        .build())
                .retrieve()
                .bodyToMono(ForecastWindowData.class)
                .doOnSuccess(data -> log.info("Скользящее окно прогноза получено: tempMean7d={}",
                        data != null ? data.tempMean7d() : "null"))
                .retryWhen(createRetrySpec("getForecastWindow"))
                .onErrorResume(ex -> {
                    log.warn("Эндпоинт forecast-window недоступен, используем fallback из forecast: {}", ex.getMessage());
                    return Mono.empty();
                });
    }

    // повторяем только при 5xx и 429, не при 4xx
    private Retry createRetrySpec(String methodName) {
        return Retry.backoff(properties.getMaxRetries(), Duration.ofMillis(properties.getRetryTimeoutMs()))
                .maxBackoff(Duration.ofMillis(properties.getRetryTimeoutMs()))
                .filter(throwable -> {
                    if (throwable instanceof WebClientResponseException wcre) {
                        // Повторяем только при серверных ошибках (5xx) и 429 (rate limit)
                        boolean shouldRetry = wcre.getStatusCode().is5xxServerError()
                                || wcre.getStatusCode().value() == 429;
                        if (shouldRetry) {
                            log.warn("[{}] Серверная ошибка {}, повтор через {} мс...",
                                    methodName, wcre.getStatusCode(), properties.getRetryTimeoutMs());
                        }
                        return shouldRetry;
                    }
                    // Повторяем при таймаутах и ошибках соединения
                    boolean isTimeout = throwable instanceof java.util.concurrent.TimeoutException
                            || throwable instanceof io.netty.channel.ConnectTimeoutException
                            || throwable instanceof java.net.ConnectException;
                    if (isTimeout) {
                        log.warn("[{}] Таймаут/ошибка соединения, повтор через {} мс: {}",
                                methodName, properties.getRetryTimeoutMs(), throwable.getMessage());
                    }
                    return isTimeout;
                })
                .doBeforeRetry(retrySignal ->
                        log.info("[{}] Повторная попытка #{} после ошибки: {}",
                                methodName, retrySignal.totalRetries() + 1,
                                retrySignal.failure().getMessage()));
    }
}

