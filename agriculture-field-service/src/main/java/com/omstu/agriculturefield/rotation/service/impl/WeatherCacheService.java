package com.omstu.agriculturefield.rotation.service.impl;

import com.omstu.agriculturefield.disease.dto.WeatherForecastData;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.rotation.dto.SeasonalWeatherDto;
import com.omstu.agriculturefield.rotation.model.WeatherHistoryEntry;
import com.omstu.agriculturefield.rotation.repository.WeatherHistoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Function;

@Service
@Slf4j
public class WeatherCacheService {

    private static final int CLIMATE_BASELINE_FROM = 2000;
    private static final int CLIMATE_YEARS_LIMIT   = 20;

    private static final double COORD_PRECISION = 100.0; // round to 2 decimal places

    private final WebClient weatherWebClient;
    private final WeatherHistoryRepository weatherHistoryRepository;
    private final WeatherHistoryPersistenceService persistenceService;

    public WeatherCacheService(
            @Qualifier("weatherWebClient") WebClient weatherWebClient,
            WeatherHistoryRepository weatherHistoryRepository,
            WeatherHistoryPersistenceService persistenceService) {
        this.weatherWebClient = weatherWebClient;
        this.weatherHistoryRepository = weatherHistoryRepository;
        this.persistenceService = persistenceService;
    }

    // DB cache (weather_history_cache) обеспечивает персистентность между перезапусками.
    // Caffeine не используем здесь намеренно: при 429 от Open-Meteo результат с неполными
    // данными не должен застревать в памяти — следующий запрос должен добрать из DB.
    public SeasonalWeatherDto fetchAveragedWeather(AgriculturalField field) {
        double lat = field.getGeom().getCentroid().getY();
        double lon = field.getGeom().getCentroid().getX();
        double latR = Math.round(lat * COORD_PRECISION) / COORD_PRECISION;
        double lonR = Math.round(lon * COORD_PRECISION) / COORD_PRECISION;

        int currentYear = java.time.Year.now().getValue();
        int toYear   = currentYear - 1;
        int fromYear = Math.max(CLIMATE_BASELINE_FROM, toYear - CLIMATE_YEARS_LIMIT + 1);

        log.info("Fetching averaged climate for field {} [{}-{}] at ({}, {})",
                field.getId(), fromYear, toYear, lat, lon);

        List<SeasonalWeatherDto> results = new CopyOnWriteArrayList<>();
        List<Mono<SeasonalWeatherDto>> apiMonos = new ArrayList<>();
        int dbHits = 0;

        for (int y = fromYear; y <= toYear; y++) {
            final int year = y;
            // 1. Try DB first (fast, synchronous)
            var dbEntry = weatherHistoryRepository
                    .findByLatRoundedAndLonRoundedAndYear(latR, lonR, year);
            if (dbEntry.isPresent()) {
                results.add(toDto(dbEntry.get()));
                dbHits++;
                continue;
            }

            // 2. DB miss — build Mono for parallel dispatch
            Mono<SeasonalWeatherDto> apiMono = weatherWebClient.get()
                    .uri(ub -> ub.path("/api/agro-data/seasonal")
                            .queryParam("lat", lat)
                            .queryParam("lon", lon)
                            .queryParam("year", year)
                            .build())
                    .retrieve()
                    .bodyToMono(SeasonalWeatherDto.class)
                    .timeout(Duration.ofSeconds(5))
                    .doOnNext(dto -> persistenceService.persist(latR, lonR, year, dto))
                    .onErrorResume(e -> {
                        log.warn("Weather API failed for year {}: {}", year, e.getMessage());
                        return Mono.empty();
                    });
            apiMonos.add(apiMono);
        }

        // Sequential with 300ms delay between requests to avoid 429 from Open-Meteo free tier.
        // 20 cold years ≈ 6s wait + network; already-cached years skip this path entirely.
        if (!apiMonos.isEmpty()) {
            List<SeasonalWeatherDto> apiResults = Flux.fromIterable(apiMonos)
                    .concatMap(mono -> mono.delaySubscription(Duration.ofMillis(300)))
                    .collectList()
                    .block(Duration.ofSeconds(120));
            if (apiResults != null) {
                results.addAll(apiResults);
            }
        }

        int apiCalls = results.size() - dbHits;
        if (results.isEmpty()) {
            log.warn("No historical weather data available for field {}", field.getId());
            return null;
        }
        log.info("Climate for field {}: {} from DB, {} from API, {} total years",
                field.getId(), dbHits, apiCalls, results.size());
        return averageWeatherData(results);
    }

    /**
     * Для текущего года: берём реальные данные за уже прошедшие периоды через /seasonal,
     * а периоды, которые ещё не наступили — подставляем из ERA5-среднего.
     * Результат мержится: реальное значение приоритетнее среднего.
     */
    public SeasonalWeatherDto fetchCurrentSeasonWeather(AgriculturalField field, SeasonalWeatherDto climateMean) {
        int currentYear = java.time.Year.now().getValue();
        double lat = field.getGeom().getCentroid().getY();
        double lon = field.getGeom().getCentroid().getX();

        try {
            SeasonalWeatherDto partial = weatherWebClient.get()
                    .uri(ub -> ub.path("/api/agro-data/seasonal")
                            .queryParam("lat", lat)
                            .queryParam("lon", lon)
                            .queryParam("year", currentYear)
                            .build())
                    .retrieve()
                    .bodyToMono(SeasonalWeatherDto.class)
                    .timeout(Duration.ofSeconds(15))
                    .onErrorResume(e -> {
                        log.warn("Partial season fetch failed for year {}: {}", currentYear, e.getMessage());
                        return Mono.empty();
                    })
                    .block();

            if (partial == null || climateMean == null) {
                log.info("Partial season data unavailable for year {} — using climate mean only", currentYear);
                return climateMean;
            }

            log.info("Merging partial season {} data with ERA5 climate mean for field {}", currentYear, field.getId());
            return mergeWithClimateMean(partial, climateMean);
        } catch (Exception e) {
            log.warn("fetchCurrentSeasonWeather failed: {} — falling back to climate mean", e.getMessage());
            return climateMean;
        }
    }

    /**
     * Возвращает только реально наблюдённые поля из partial (те что не null после /seasonal).
     * Поля которые были null в partial (будущие периоды) остаются null — ML возьмёт свои нормы.
     * year берётся из partial чтобы buildClimateFactor мог определить currentSeason.
     */
    public SeasonalWeatherDto extractObservedOnly(SeasonalWeatherDto partial, SeasonalWeatherDto mean) {
        if (partial == null) return mean;
        return partial; // после фикса isPeriodCovered partial уже содержит null для будущих периодов
    }

    /**
     * Мерж: если partial содержит реальное значение — берём его, иначе берём из ERA5-среднего.
     */
    private SeasonalWeatherDto mergeWithClimateMean(SeasonalWeatherDto partial, SeasonalWeatherDto mean) {
        return new SeasonalWeatherDto(
                partial.year(),
                coalesce(partial.precipOctMar(),       mean.precipOctMar()),
                coalesce(partial.minTempWinter(),      mean.minTempWinter()),
                coalesce(partial.precipAprMay(),       mean.precipAprMay()),
                coalesce(partial.tempSumAprMay(),      mean.tempSumAprMay()),
                partial.frostRiskSpring() != null ? partial.frostRiskSpring() : mean.frostRiskSpring(),
                coalesce(partial.gtkAprMay(),          mean.gtkAprMay()),
                coalesce(partial.precipJunJul(),       mean.precipJunJul()),
                coalesce(partial.tempSumJunJul(),      mean.tempSumJunJul()),
                coalesce(partial.heatStressJunJul(),   mean.heatStressJunJul()),
                coalesce(partial.extremeHeatJunJul(),  mean.extremeHeatJunJul()),
                coalesce(partial.avgTempJunJul(),      mean.avgTempJunJul()),
                coalesce(partial.gtkJunJul(),          mean.gtkJunJul()),
                coalesce(partial.precipAugSep(),       mean.precipAugSep()),
                coalesce(partial.tempSumAugSep(),      mean.tempSumAugSep()),
                coalesce(partial.heatStressAugSep(),   mean.heatStressAugSep()),
                coalesce(partial.gtkAugSep(),          mean.gtkAugSep()),
                coalesce(partial.gtkAprSep(),          mean.gtkAprSep()),
                coalesce(partial.tempSumAprSep(),      mean.tempSumAprSep()),
                coalesce(partial.totalHeatStressDays(), mean.totalHeatStressDays()),
                coalesce(partial.minTempVegetation(),  mean.minTempVegetation()),
                coalesce(partial.longestDryPeriod(),   mean.longestDryPeriod())
        );
    }

    private static <T> T coalesce(T a, T b) {
        return a != null ? a : b;
    }

    public WeatherForecastData fetchForecastWeather(double lat, double lon) {
        try {
            return weatherWebClient.get()
                    .uri(ub -> ub.path("/api/agro-data/forecast")
                            .queryParam("lat", lat)
                            .queryParam("lon", lon)
                            .queryParam("days", 16)
                            .build())
                    .retrieve()
                    .bodyToMono(WeatherForecastData.class)
                    .timeout(Duration.ofSeconds(10))
                    .onErrorResume(e -> {
                        log.warn("Forecast fetch failed: {}", e.getMessage());
                        return Mono.empty();
                    })
                    .block();
        } catch (Exception e) {
            log.warn("Forecast fetch error: {}", e.getMessage());
            return null;
        }
    }

    private SeasonalWeatherDto toDto(WeatherHistoryEntry e) {
        return new SeasonalWeatherDto(
                e.getYear(),
                e.getPrecipOctMar(),
                e.getMinTempWinter(),
                e.getPrecipAprMay(),
                e.getTempSumAprMay(),
                e.getFrostRiskSpring(),
                e.getGtkAprMay(),
                e.getPrecipJunJul(),
                e.getTempSumJunJul(),
                e.getHeatStressJunJul(),
                e.getExtremeHeatJunJul(),
                e.getAvgTempJunJul(),
                e.getGtkJunJul(),
                e.getPrecipAugSep(),
                e.getTempSumAugSep(),
                e.getHeatStressAugSep(),
                e.getGtkAugSep(),
                e.getGtkAprSep(),
                e.getTempSumAprSep(),
                e.getTotalHeatStressDays(),
                e.getMinTempVegetation(),
                e.getLongestDryPeriod()
        );
    }

    // ── averaging helpers ───────────────────────────────────────────────────────

    public SeasonalWeatherDto averageWeatherData(List<SeasonalWeatherDto> data) {
        return new SeasonalWeatherDto(
                null,
                avgDbl(data, SeasonalWeatherDto::precipOctMar),
                avgDbl(data, SeasonalWeatherDto::minTempWinter),
                avgDbl(data, SeasonalWeatherDto::precipAprMay),
                avgDbl(data, SeasonalWeatherDto::tempSumAprMay),
                data.stream().filter(d -> Boolean.TRUE.equals(d.frostRiskSpring())).count()
                        >= (data.size() >= 6 ? (long) Math.ceil(data.size() / 3.0) : 2L),
                avgDbl(data, SeasonalWeatherDto::gtkAprMay),
                avgDbl(data, SeasonalWeatherDto::precipJunJul),
                avgDbl(data, SeasonalWeatherDto::tempSumJunJul),
                avgInt(data, SeasonalWeatherDto::heatStressJunJul),
                avgInt(data, SeasonalWeatherDto::extremeHeatJunJul),
                avgDbl(data, SeasonalWeatherDto::avgTempJunJul),
                avgDbl(data, SeasonalWeatherDto::gtkJunJul),
                avgDbl(data, SeasonalWeatherDto::precipAugSep),
                avgDbl(data, SeasonalWeatherDto::tempSumAugSep),
                avgInt(data, SeasonalWeatherDto::heatStressAugSep),
                avgDbl(data, SeasonalWeatherDto::gtkAugSep),
                avgDbl(data, SeasonalWeatherDto::gtkAprSep),
                avgDbl(data, SeasonalWeatherDto::tempSumAprSep),
                avgInt(data, SeasonalWeatherDto::totalHeatStressDays),
                avgDbl(data, SeasonalWeatherDto::minTempVegetation),
                avgInt(data, SeasonalWeatherDto::longestDryPeriod)
        );
    }

    private static Double avgDbl(List<SeasonalWeatherDto> data, Function<SeasonalWeatherDto, Double> fn) {
        OptionalDouble opt = data.stream().map(fn).filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue).average();
        return opt.isPresent() ? opt.getAsDouble() : null;
    }

    private static Integer avgInt(List<SeasonalWeatherDto> data, Function<SeasonalWeatherDto, Integer> fn) {
        OptionalDouble opt = data.stream().map(fn).filter(Objects::nonNull)
                .mapToDouble(Integer::doubleValue).average();
        return opt.isPresent() ? (int) Math.round(opt.getAsDouble()) : null;
    }
}
