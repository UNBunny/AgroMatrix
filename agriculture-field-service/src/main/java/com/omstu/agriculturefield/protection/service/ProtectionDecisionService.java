package com.omstu.agriculturefield.protection.service;

import com.omstu.agriculturefield.disease.dto.WeatherForecastData;
import com.omstu.agriculturefield.disease.service.impl.WeatherServiceClient;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import com.omstu.agriculturefield.protection.client.NdviSnapshotClient;
import com.omstu.agriculturefield.protection.dto.*;
import com.omstu.agriculturefield.protection.repository.CropProtectionCatalogRepository;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

// оркестрирует анализ: погода 48ч + прогноз 24ч + NDVI → передаёт Python ML и возвращает ThreatAnalysisResponse
@Service
@Slf4j
public class ProtectionDecisionService {

    private final AgriculturalFieldRepository fieldRepository;
    private final CropProtectionCatalogRepository catalogRepository;
    private final WeatherServiceClient weatherServiceClient;
    private final NdviSnapshotClient ndviSnapshotClient;
    private final WebClient mlWebClient;

    public ProtectionDecisionService(
            AgriculturalFieldRepository fieldRepository,
            CropProtectionCatalogRepository catalogRepository,
            WeatherServiceClient weatherServiceClient,
            NdviSnapshotClient ndviSnapshotClient,
            @Qualifier("mlWebClient") WebClient mlWebClient) {
        this.fieldRepository = fieldRepository;
        this.catalogRepository = catalogRepository;
        this.weatherServiceClient = weatherServiceClient;
        this.ndviSnapshotClient = ndviSnapshotClient;
        this.mlWebClient = mlWebClient;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Mono<ThreatAnalysisResponse> analyze(ProtectionAnalysisRequest request) {
        log.info("Protection analysis: fieldId={}, bbch={}, diseases={}",
                request.fieldId(), request.bbchStage(), request.targetDiseases());

        AgriculturalField field = fieldRepository.findById(request.fieldId())
                .orElseThrow(() -> new RuntimeException("Field not found: " + request.fieldId()));

        String cropCode = field.getCropType();
        Point centroid = field.getGeom().getCentroid();
        double lat = centroid.getY();
        double lon = centroid.getX();

        List<List<Double>> coordinates = extractPolygonCoordinates(field);

        List<CropProtectionEntryDto> catalogEntries =
                loadCatalogEntries(cropCode, request.targetDiseases());
        log.info("Loaded {} catalog entries for cropCode={}", catalogEntries.size(), cropCode);

        LocalDate today = LocalDate.now();
        String histStart = today.minusDays(2).toString();
        String histEnd   = today.toString();

        Mono<WeatherForecastData> historyMono = weatherServiceClient
                .getHistoricalMetrics(lat, lon, histStart, histEnd)
                .defaultIfEmpty(emptyWeather());

        Mono<WeatherForecastData> forecastMono = weatherServiceClient
                .getForecastMetrics(lat, lon, 1)
                .defaultIfEmpty(emptyWeather());

        Mono<NdviSnapshotDto> ndviMono = ndviSnapshotClient
                .getNdviSnapshot(request.fieldId(), coordinates)
                .defaultIfEmpty(new NdviSnapshotDto(null, null, null, null, "UNAVAILABLE"));

        return Mono.zip(historyMono, forecastMono, ndviMono)
                .flatMap(tuple -> {
                    WeatherWindowDto weatherWindow =
                            buildWeatherWindow(tuple.getT1(), tuple.getT2());
                    NdviSnapshotDto ndvi = tuple.getT3();

                    ProtectionAnalysisPayload payload = new ProtectionAnalysisPayload(
                            request.fieldId(),
                            cropCode,
                            request.bbchStage(),
                            request.targetDiseases() != null ? request.targetDiseases() : List.of(),
                            weatherWindow,
                            ndvi,
                            catalogEntries);

                    log.info("Sending payload to ML: fieldId={}, entries={}, lwd={}h",
                            request.fieldId(), catalogEntries.size(),
                            weatherWindow.leafWetnessDurationHours());

                    return mlWebClient.post()
                            .uri("/ml/analyze-threats")
                            .bodyValue(payload)
                            .retrieve()
                            .bodyToMono(ThreatAnalysisResponse.class)
                            .doOnSuccess(r -> log.info(
                                    "ML analysis done: riskLevel={}, recommendations={}",
                                    r.riskLevel(), r.recommendations().size()))
                            .doOnError(e -> log.error("ML analyze-threats failed: {}", e.getMessage()));
                });
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private List<CropProtectionEntryDto> loadCatalogEntries(String cropCode,
                                                             List<String> diseases) {
        var raw = (diseases != null && !diseases.isEmpty())
                ? catalogRepository.findActiveByCropCodeAndDiseaseNames(cropCode, diseases)
                : catalogRepository.findActiveByCropCode(cropCode);

        return raw.stream()
                .map(e -> new CropProtectionEntryDto(
                        e.getId(), e.getCropCode(), e.getDiseaseName(), e.getPathogenLatin(),
                        e.getDiseaseType(), e.getProductName(), e.getFracGroup(), e.getFracCode(),
                        e.getActiveIngredients(), e.getAiConcentration(), e.getApplicationType(),
                        e.getBbchFrom(), e.getBbchTo(), e.getBbchNote(),
                        e.getDoseRate(), e.getDoseValue(), e.getDoseUnit(),
                        e.getTempMinC(), e.getTempOptC(), e.getTempMaxC(),
                        e.getPhiDays(), e.getNotes(), e.getIsActive()))
                .collect(Collectors.toList());
    }

    private WeatherWindowDto buildWeatherWindow(WeatherForecastData history,
                                                WeatherForecastData forecast) {
        Double humidity48h  = history.avgHumidity();
        Double precip48h    = history.sumPrecipitation();
        double lwd          = estimateLwd(humidity48h, precip48h, history.avgTemp());

        Double forecastPrecip    = forecast.sumPrecipitation();
        Double forecastHumidity  = forecast.avgHumidity();

        boolean rainExpectedIn3h = forecastPrecip != null && forecastPrecip > 1.5
                && forecastHumidity != null && forecastHumidity > 72;

        String dataSource = (history.avgTemp() != null || forecast.avgTemp() != null)
                ? "LIVE" : "FALLBACK";

        return new WeatherWindowDto(
                history.avgTemp(),
                null,
                history.minTempRecord(),
                humidity48h,
                precip48h,
                lwd,
                forecast.avgTemp(),
                forecastHumidity,
                forecastPrecip,
                rainExpectedIn3h,
                null,
                dataSource);
    }

    // LWD по Magarey et al. 2005: ниже 10°C капаем не более 8ч, ниже 5°C — ещё вдвое
    private double estimateLwd(Double humidity, Double precip, Double temp) {
        if (humidity == null) return 0.0;
        double h = humidity;
        double p = precip != null ? precip : 0.0;
        double t = temp != null ? temp : 20.0;
        double base;
        if      (h >= 90 && p > 5) base = 16.0;
        else if (h >= 90)          base = 12.0;
        else if (h >= 85 && p > 2) base = 12.0;
        else if (h >= 85)          base =  8.0;
        else if (h >= 80 && p > 0) base =  6.0;
        else if (h >= 75)          base =  3.0;
        else                       base = Math.max(0.0, (h - 65.0) / 5.0);
        if (t < 5.0)  base = Math.min(base, 8.0) * 0.5;
        else if (t < 10.0) base = Math.min(base, 8.0);
        return base;
    }

    private List<List<Double>> extractPolygonCoordinates(AgriculturalField field) {
        if (field.getGeom() == null) return List.of();
        Coordinate[] coords = field.getGeom().getExteriorRing().getCoordinates();
        return Arrays.stream(coords)
                .map(c -> List.of(c.getX(), c.getY()))
                .collect(Collectors.toList());
    }

    private WeatherForecastData emptyWeather() {
        return new WeatherForecastData(
                null, null, null, null, null, null, null, null, null, null);
    }
}
