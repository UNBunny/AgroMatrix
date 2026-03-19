package com.omstu.ndvi.service;

import com.omstu.ndvi.dto.NdviAvailableDatesDto;
import com.omstu.ndvi.dto.NdviAvailableDatesRequest;
import com.omstu.ndvi.dto.NdviFieldRequest;
import com.omstu.ndvi.dto.NdviHistoryResponse;
import com.omstu.ndvi.dto.NdviImageDto;
import com.omstu.ndvi.dto.NdviImageRequest;
import com.omstu.ndvi.dto.NdviRecordDto;
import com.omstu.ndvi.exception.ExternalServiceException;
import com.omstu.ndvi.mapper.NdviRecordMapper;
import com.omstu.ndvi.model.NdviRecord;
import com.omstu.ndvi.repository.NdviRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class NdviService {

    private final NdviRecordRepository ndviRecordRepository;
    private final NdviRecordMapper ndviRecordMapper;
    @Qualifier("mlWebClient")
    private final WebClient mlWebClient;

    // ───────────────────────── Public API ─────────────────────────

    /**
     * Получить последнее (текущее) значение NDVI для поля из БД.
     * Если записей нет — запрашиваем реальные спутниковые данные через GEE за последний месяц.
     */
    @Cacheable(value = "ndviCurrent", key = "#fieldId")
    public NdviRecordDto getCurrentNdvi(Long fieldId) {
        return ndviRecordRepository.findTopByFieldIdOrderByRecordDateDesc(fieldId)
                .map(ndviRecordMapper::toDto)
                .orElse(null);
    }

    /**
     * История NDVI за период (только данные из БД).
     */
    @Cacheable(value = "ndviHistory", key = "#fieldId + ':' + #from + ':' + #to")
    public NdviHistoryResponse getNdviHistory(Long fieldId, String fieldName, LocalDate from, LocalDate to) {
        List<NdviRecord> records = ndviRecordRepository
                .findByFieldIdAndRecordDateBetweenOrderByRecordDateAsc(fieldId, from, to);

        if (records.isEmpty()) {
            log.info("No NDVI records for field {} in period {} — {}", fieldId, from, to);
        }

        NdviRecordDto current = ndviRecordRepository.findTopByFieldIdOrderByRecordDateDesc(fieldId)
                .map(ndviRecordMapper::toDto)
                .orElse(records.isEmpty() ? null : ndviRecordMapper.toDto(records.getLast()));

        List<NdviRecordDto> history = records.stream().map(ndviRecordMapper::toDto).toList();

        return new NdviHistoryResponse(fieldId, fieldName, current, history);
    }

    /**
     * Получить историю NDVI за период.
     * Если данных в БД нет — автоматически загружает спутниковые данные через GEE и сохраняет.
     */
    public NdviHistoryResponse getOrFetchNdviHistory(NdviFieldRequest request) {
        boolean noRecords = ndviRecordRepository
                .findByFieldIdAndRecordDateBetweenOrderByRecordDateAsc(
                        request.fieldId(), request.dateStart(), request.dateEnd())
                .isEmpty();

        if (noRecords) {
            log.info("No NDVI records for field {} in {} — {}, fetching from GEE",
                    request.fieldId(), request.dateStart(), request.dateEnd());
            return fetchSatelliteHistory(request);
        }

        return getNdviHistory(request.fieldId(), request.fieldName(), request.dateStart(), request.dateEnd());
    }

    /**
     * Загрузить реальную спутниковую историю NDVI за период через GEE.
     * Запрашивает данные для каждой доступной даты и сохраняет в БД.
     */
    @Caching(evict = {
            @CacheEvict(value = "ndviCurrent", key = "#request.fieldId()"),
            @CacheEvict(value = "ndviHistory", allEntries = true)
    })
    @SuppressWarnings({"unchecked", "rawtypes"})
    public NdviHistoryResponse fetchSatelliteHistory(NdviFieldRequest request) {
        Long fieldId = request.fieldId();
        List<List<Double>> coords = request.coordinates();

        Map<String, Object> datesRequest = Map.of(
                "coordinates", coords,
                "date_start", request.dateStart().toString(),
                "date_end", request.dateEnd().toString(),
                "max_cloud_pct", 50
        );

        log.info("Fetching available satellite dates for field {} ({} → {})",
                fieldId, request.dateStart(), request.dateEnd());

        Map<String, Object> datesResponse = mlWebClient.post()
                .uri("/ndvi/available-dates")
                .bodyValue(datesRequest)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (datesResponse == null || datesResponse.get("dates") == null) {
            log.warn("No available dates from GEE for field {}", fieldId);
            return getNdviHistory(fieldId, request.fieldName(), request.dateStart(), request.dateEnd());
        }

        List<String> availableDates = (List<String>) datesResponse.get("dates");
        log.info("Found {} available dates for field {}", availableDates.size(), fieldId);

        for (String dateStr : availableDates) {
            LocalDate date = LocalDate.parse(dateStr);

            if (ndviRecordRepository.findByFieldIdAndRecordDate(fieldId, date).isPresent()) {
                continue;
            }

            try {
                LocalDate periodStart = date.minusDays(5);
                LocalDate periodEnd = date.plusDays(5);

                Map<String, Object> ndviRequest = Map.of(
                        "coordinates", coords,
                        "date_start", periodStart.toString(),
                        "date_end", periodEnd.toString(),
                        "max_cloud_pct", 70,
                        "scale", 10
                );

                Map<String, Object> ndviResponse = mlWebClient.post()
                        .uri("/ndvi/satellite")
                        .bodyValue(ndviRequest)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                if (ndviResponse != null && ndviResponse.get("error") == null) {
                    double mean = toDouble(ndviResponse.get("ndvi_mean"));
                    if (mean != 0.0) {
                        NdviRecord record = NdviRecord.builder()
                                .fieldId(fieldId)
                                .recordDate(date)
                                .ndviMean(clampNdvi(mean))
                                .ndviMin(clampNdvi(toDouble(ndviResponse.get("ndvi_min"))))
                                .ndviMax(clampNdvi(toDouble(ndviResponse.get("ndvi_max"))))
                                .ndviStd(Math.abs(toDouble(ndviResponse.get("ndvi_std"))))
                                .source("GEE_SENTINEL2")
                                .createdAt(LocalDateTime.now())
                                .build();
                        ndviRecordRepository.save(record);
                        log.info("Saved satellite NDVI for field {} date {}: mean={}", fieldId, date, mean);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch satellite NDVI for field {} date {}: {}", fieldId, dateStr, e.getMessage());
            }
        }

        return getNdviHistory(fieldId, request.fieldName(), request.dateStart(), request.dateEnd());
    }

    /**
     * Принудительное обновление NDVI для поля через GEE (ручной триггер).
     */
    public NdviRecordDto refreshNdvi(NdviFieldRequest request) {
        NdviFieldRequest refreshRequest = new NdviFieldRequest(
                request.fieldId(),
                request.fieldName(),
                request.coordinates(),
                LocalDate.now().minusMonths(1),
                LocalDate.now()
        );
        return fetchSatelliteNdvi(refreshRequest);
    }

    /**
     * Сброс кэша NDVI — удаляем все записи поля.
     */
    public void clearCache(Long fieldId) {
        List<NdviRecord> records = ndviRecordRepository.findByFieldIdOrderByRecordDateDesc(fieldId);
        ndviRecordRepository.deleteAll(records);
        log.info("Cleared {} NDVI records for field {}", records.size(), fieldId);
    }

    /**
     * Обновить NDVI для поля через GEE за последний месяц.
     */
    @Caching(evict = {
            @CacheEvict(value = "ndviCurrent", key = "#request.fieldId()"),
            @CacheEvict(value = "ndviHistory", allEntries = true)
    })
    @SuppressWarnings({"unchecked", "rawtypes"})
    public NdviRecordDto fetchSatelliteNdvi(NdviFieldRequest request) {
        Long fieldId = request.fieldId();
        List<List<Double>> coords = request.coordinates();

        Map<String, Object> requestBody = Map.of(
                "coordinates", coords,
                "date_start", request.dateStart().toString(),
                "date_end", request.dateEnd().toString(),
                "max_cloud_pct", 70,
                "scale", 10
        );

        log.info("Requesting satellite NDVI from GEE for field {} ({} → {})",
                fieldId, request.dateStart(), request.dateEnd());

        Map<String, Object> response = mlWebClient.post()
                .uri("/ndvi/satellite")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null) {
            throw new ExternalServiceException("Empty response from ml-service /ndvi/satellite");
        }

        String error = (String) response.get("error");
        if (error != null && !error.isEmpty()) {
            throw new ExternalServiceException("GEE error: " + error);
        }

        double mean = toDouble(response.get("ndvi_mean"));
        double min = toDouble(response.get("ndvi_min"));
        double max = toDouble(response.get("ndvi_max"));
        double std = toDouble(response.get("ndvi_std"));
        int pixelCount = response.get("pixel_count") != null
                ? ((Number) response.get("pixel_count")).intValue() : 0;
        int imagesUsed = response.get("images_used") != null
                ? ((Number) response.get("images_used")).intValue() : 0;

        log.info("GEE satellite NDVI for field {}: mean={}, pixels={}, images={}",
                fieldId, mean, pixelCount, imagesUsed);

        NdviRecord record = NdviRecord.builder()
                .fieldId(fieldId)
                .recordDate(request.dateEnd().minusDays(1))
                .ndviMean(clampNdvi(mean))
                .ndviMin(clampNdvi(min))
                .ndviMax(clampNdvi(max))
                .ndviStd(Math.abs(std))
                .source("GEE_SENTINEL2")
                .createdAt(LocalDateTime.now())
                .build();

        NdviRecord saved = ndviRecordRepository.save(record);
        return ndviRecordMapper.toDto(saved);
    }

    /**
     * Получить попиксельную NDVI карту поля за конкретную дату.
     */
    @SuppressWarnings({"unchecked", "rawtypes"})
    public NdviImageDto fetchNdviImage(NdviImageRequest request) {
        Map<String, Object> requestBody = Map.of(
                "coordinates", request.coordinates(),
                "date", request.date(),
                "search_days", 15,
                "max_cloud_pct", 70,
                "dimensions", 512
        );

        log.info("Requesting NDVI image from GEE for field {} date {}", request.fieldId(), request.date());

        Map<String, Object> response = mlWebClient.post()
                .uri("/ndvi/satellite-image")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null) {
            throw new ExternalServiceException("Empty response from ml-service /ndvi/satellite-image");
        }

        String error = (String) response.get("error");
        if (error != null && !error.isEmpty()) {
            return new NdviImageDto(null, null, null, null, null, null, 0, error);
        }

        List<Double> bbox = response.get("bbox") != null
                ? ((List<Number>) response.get("bbox")).stream().map(Number::doubleValue).toList()
                : null;

        return new NdviImageDto(
                (String) response.get("image_url"),
                bbox,
                toDouble(response.get("ndvi_mean")),
                toDouble(response.get("ndvi_min")),
                toDouble(response.get("ndvi_max")),
                (String) response.get("actual_date"),
                response.get("images_found") != null ? ((Number) response.get("images_found")).intValue() : 0,
                null
        );
    }

    /**
     * Получить список дат с доступными чистыми снимками Sentinel-2.
     */
    @SuppressWarnings({"unchecked", "rawtypes"})
    public NdviAvailableDatesDto fetchAvailableDates(NdviAvailableDatesRequest request) {
        Map<String, Object> requestBody = Map.of(
                "coordinates", request.coordinates(),
                "date_start", request.dateStart(),
                "date_end", request.dateEnd(),
                "max_cloud_pct", 50
        );

        log.info("Requesting available dates from GEE for field {} ({} → {})",
                request.fieldId(), request.dateStart(), request.dateEnd());

        Map<String, Object> response = mlWebClient.post()
                .uri("/ndvi/available-dates")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null) {
            return new NdviAvailableDatesDto(List.of(), "Empty response");
        }

        String error = (String) response.get("error");
        List<String> dates = response.get("dates") != null
                ? (List<String>) response.get("dates")
                : List.of();

        return new NdviAvailableDatesDto(dates, error);
    }

    // ───────────────────────── Utilities ─────────────────────────

    private double clampNdvi(double value) {
        return Math.max(-1.0, Math.min(1.0, Math.round(value * 10000.0) / 10000.0));
    }

    private double toDouble(Object val) {
        if (val == null) return 0.0;
        if (val instanceof Number n) return n.doubleValue();
        return Double.parseDouble(val.toString());
    }
}
