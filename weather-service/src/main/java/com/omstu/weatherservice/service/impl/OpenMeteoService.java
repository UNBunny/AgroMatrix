package com.omstu.weatherservice.service.impl;

import com.omstu.weatherservice.config.WeatherApiProperties;
import com.omstu.weatherservice.dto.OpenMeteoResponse;
import com.omstu.weatherservice.dto.WeatherRequestType;
import com.omstu.weatherservice.mapper.OpenMeteoMapper;
import com.omstu.weatherservice.service.ExternalFieldService;
import com.omstu.weatherservice.service.strategy.ForecastRequestStrategy;
import com.omstu.weatherservice.service.strategy.HistoricalRequestStrategy;
import com.omstu.weatherservice.service.strategy.WeatherRequestStrategy;
import com.omstu.weatherservice.service.utils.DateUtils;
import com.omstu.weatherservice.validation.DateValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

@Service
@Slf4j
public class OpenMeteoService implements ExternalFieldService {

    private final WebClient forecastWebClient;
    private final WebClient historicalWebClient;
    private final OpenMeteoMapper openMeteoMapper;
    private final DateValidator dateValidator;
    private final WeatherApiProperties properties;

    public OpenMeteoService(
            WebClient.Builder webClientBuilder,
            OpenMeteoMapper openMeteoMapper,
            DateValidator dateValidator,
            WeatherApiProperties properties
    ) {
        this.forecastWebClient = webClientBuilder
                .baseUrl(properties.getForecastBaseUrl())
                .defaultHeader("User-Agent", "AgroPlanPro/1.0 (weather-service)")
                .build();

        HttpClient noPoolHttpClient = HttpClient.create(
                        ConnectionProvider.newConnection())
                .keepAlive(false);

        this.historicalWebClient = WebClient.builder()
                .clientConnector(new org.springframework.http.client.reactive.ReactorClientHttpConnector(noPoolHttpClient))
                .codecs(configurer ->
                        configurer.defaultCodecs().maxInMemorySize(properties.getMaxInMemorySize()))
                .baseUrl(properties.getHistoricalBaseUrl())
                .defaultHeader("User-Agent", "AgroPlanPro/1.0 (weather-service)")
                .defaultHeader("Connection", "close")
                .build();

        this.openMeteoMapper = openMeteoMapper;
        this.dateValidator = dateValidator;
        this.properties = properties;

        log.info("Weather service initialized with forecast URL: {} and historical URL: {}",
                properties.getForecastBaseUrl(), properties.getHistoricalBaseUrl());
    }

    @Override
    @Cacheable(
            cacheNames = "weatherApi",
            // Округление координат до 0.01° (~1 км): внутри ячейки данные Open-Meteo идентичны.
            // Spring 6.1+ автоматически кэширует материализованное значение Mono.
            key = "T(java.lang.Math).round(#lat * 100) / 100.0 + ',' " +
                    "+ T(java.lang.Math).round(#lon * 100) / 100.0 + ':' " +
                    "+ #type + ':' + (#days == null ? '-' : #days) + ':' " +
                    "+ (#startDate == null ? '-' : #startDate) + ':' " +
                    "+ (#endDate == null ? '-' : #endDate)"
    )
    public Mono<OpenMeteoResponse> getWeather(
            Double lat, Double lon, WeatherRequestType type,
            Integer days, String startDate, String endDate
    ) {
        dateValidator.validateCoordinates(lat, lon);

        if (type == WeatherRequestType.FORECAST) {
            return getForecastWeather(lat, lon, days);
        } else {
            return getHistoricalWeather(lat, lon, startDate, endDate);
        }
    }

    private Mono<OpenMeteoResponse> getForecastWeather(Double lat, Double lon, Integer days) {
        dateValidator.validateForecastDays(days);

        log.info("Requesting {}-day weather forecast for location: lat={}, lon={}", days, lat, lon);

        WeatherRequestStrategy strategy = new ForecastRequestStrategy(days);
        return executeStrategy(strategy, forecastWebClient, lat, lon);
    }

    private Mono<OpenMeteoResponse> getHistoricalWeather(
            Double lat, Double lon, String startDate, String endDate
    ) {
        dateValidator.validateHistoricalPeriod(startDate, endDate);

        LocalDate start = LocalDate.parse(startDate);
        LocalDate end = LocalDate.parse(endDate);

        if (DateUtils.isLongPeriod(start, end, properties.getLongPeriodThresholdMonths())) {
            log.info("Requesting historical data for long period {} to {} at location: lat={}, lon={}",
                    startDate, endDate, lat, lon);
            return getHistoricalDataInChunks(lat, lon, start, end);
        }

        log.info("Requesting historical data for period {} to {} at location: lat={}, lon={}",
                startDate, endDate, lat, lon);

        WeatherRequestStrategy strategy = new HistoricalRequestStrategy(startDate, endDate);
        return executeStrategy(strategy, historicalWebClient, lat, lon);
    }

    private Mono<OpenMeteoResponse> getHistoricalDataInChunks(
            Double lat, Double lon, LocalDate start, LocalDate end
    ) {
        List<DateUtils.DateRange> ranges = DateUtils.splitByThreeMonths(start, end);

        log.info("Splitting period {} to {} into {} chunks of 3 months each",
                start, end, ranges.size());

        return Flux.fromIterable(ranges)
                .concatMap(range -> {
                    WeatherRequestStrategy strategy = new HistoricalRequestStrategy(
                            range.startDate().toString(),
                            range.endDate().toString()
                    );
                    return executeStrategy(strategy, historicalWebClient, lat, lon)
                            .onErrorResume(e -> {
                                log.warn("Failed to fetch data for period {}: {}", range, e.getMessage());
                                return Mono.empty();
                            });
                })
                .collectList()
                .map(responses -> {
                    log.info("Combining {} responses into single result", responses.size());
                    return openMeteoMapper.combineResponses(responses);
                })
                .doOnSuccess(response ->
                        log.info("Successfully combined historical data from {} chunks for location: lat={}, lon={}",
                                ranges.size(), lat, lon));
    }

    private Mono<OpenMeteoResponse> executeStrategy(
            WeatherRequestStrategy strategy, WebClient webClient, Double lat, Double lon
    ) {
        return strategy.execute(webClient, lat, lon)
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(2))
                        .filter(e -> e instanceof reactor.netty.http.client.PrematureCloseException
                                || e.getMessage() != null && e.getMessage().contains("prematurely"))
                        .doBeforeRetry(s -> log.warn("Retrying {} request (attempt {}) for lat={}, lon={}",
                                strategy.getType(), s.totalRetries() + 1, lat, lon)))
                .doOnError(error ->
                        log.error("Failed to execute {} request for lat={}, lon={}: {}",
                                strategy.getType(), lat, lon, error.getMessage()));
    }
}