package com.omstu.ndvi.controller;

import com.omstu.ndvi.dto.NdviAvailableDatesDto;
import com.omstu.ndvi.dto.NdviAvailableDatesRequest;
import com.omstu.ndvi.dto.NdviFieldRequest;
import com.omstu.ndvi.dto.NdviHistoryResponse;
import com.omstu.ndvi.dto.NdviImageDto;
import com.omstu.ndvi.dto.NdviImageRequest;
import com.omstu.ndvi.dto.NdviRecordDto;
import com.omstu.ndvi.service.FieldCoordinatesStore;
import com.omstu.ndvi.service.NdviInitService;
import com.omstu.ndvi.service.NdviService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/ndvi")
@RequiredArgsConstructor
@Slf4j
public class NdviController {

    private final NdviService ndviService;
    private final NdviInitService ndviInitService;
    private final FieldCoordinatesStore coordinatesStore;

    /**
     * Текущее (последнее) значение NDVI для поля из БД.
     * GET /api/ndvi/fields/{fieldId}/current
     */
    @GetMapping("/fields/{fieldId}/current")
    public NdviRecordDto getCurrentNdvi(@PathVariable Long fieldId) {
        log.info("Fetching current NDVI for field {}", fieldId);
        return ndviService.getCurrentNdvi(fieldId);
    }

    /**
     * История NDVI за период (только из БД).
     * GET /api/ndvi/fields/{fieldId}/history?from=...&to=...&fieldName=...
     */
    @GetMapping("/fields/{fieldId}/history")
    public NdviHistoryResponse getNdviHistory(
            @PathVariable Long fieldId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "") String fieldName
    ) {
        LocalDate dateTo = to != null ? to : LocalDate.now();
        LocalDate dateFrom = from != null ? from : dateTo.minusMonths(12);
        log.info("Fetching NDVI history for field {} from {} to {}", fieldId, dateFrom, dateTo);
        return ndviService.getNdviHistory(fieldId, fieldName, dateFrom, dateTo);
    }

    /**
     * История NDVI за период с авто-загрузкой из GEE, если данных нет.
     * POST /api/ndvi/history/auto
     */
    @PostMapping("/history/auto")
    public NdviHistoryResponse getOrFetchNdviHistory(@Valid @RequestBody NdviFieldRequest request) {
        log.info("Auto-fetch NDVI history for field {} from {} to {}",
                request.fieldId(), request.dateStart(), request.dateEnd());
        coordinatesStore.put(request);
        return ndviService.getOrFetchNdviHistory(request);
    }

    /**
     * Принудительное обновление NDVI через GEE.
     * POST /api/ndvi/refresh
     */
    @PostMapping("/refresh")
    @ResponseStatus(HttpStatus.OK)
    public NdviRecordDto refreshNdvi(@Valid @RequestBody NdviFieldRequest request) {
        log.info("Manual NDVI refresh requested for field {}", request.fieldId());
        coordinatesStore.put(request);
        return ndviService.refreshNdvi(request);
    }

    /**
     * Загрузить спутниковую историю NDVI за период через GEE и сохранить в БД.
     * POST /api/ndvi/satellite-history
     */
    @PostMapping("/satellite-history")
    @ResponseStatus(HttpStatus.OK)
    public NdviHistoryResponse fetchSatelliteHistory(@Valid @RequestBody NdviFieldRequest request) {
        log.info("Satellite NDVI history requested for field {} from {} to {}",
                request.fieldId(), request.dateStart(), request.dateEnd());
        coordinatesStore.put(request);
        return ndviService.fetchSatelliteHistory(request);
    }

    /**
     * Спутниковый NDVI через Google Earth Engine (Sentinel-2 SR, cloud masking, MVC).
     * POST /api/ndvi/satellite
     */
    @PostMapping("/satellite")
    @ResponseStatus(HttpStatus.OK)
    public NdviRecordDto fetchSatelliteNdvi(@Valid @RequestBody NdviFieldRequest request) {
        log.info("Satellite NDVI (GEE) requested for field {} from {} to {}",
                request.fieldId(), request.dateStart(), request.dateEnd());
        coordinatesStore.put(request);
        return ndviService.fetchSatelliteNdvi(request);
    }

    /**
     * Попиксельная NDVI карта поля за конкретную дату.
     * POST /api/ndvi/image
     */
    @PostMapping("/image")
    @ResponseStatus(HttpStatus.OK)
    public NdviImageDto fetchNdviImage(@Valid @RequestBody NdviImageRequest request) {
        log.info("NDVI satellite image requested for field {} date {}", request.fieldId(), request.date());
        return ndviService.fetchNdviImage(request);
    }

    /**
     * Список дат с доступными чистыми снимками Sentinel-2.
     * POST /api/ndvi/available-dates
     */
    @PostMapping("/available-dates")
    public NdviAvailableDatesDto getAvailableDates(@Valid @RequestBody NdviAvailableDatesRequest request) {
        log.info("Available NDVI dates requested for field {} ({} → {})",
                request.fieldId(), request.dateStart(), request.dateEnd());
        return ndviService.fetchAvailableDates(request);
    }

    /**
     * Инициализация истории NDVI при создании поля (асинхронно).
     * POST /api/ndvi/init
     */
    @PostMapping("/init")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void initNdviHistory(@Valid @RequestBody NdviFieldRequest request) {
        log.info("NDVI init requested for field {}", request.fieldId());
        coordinatesStore.put(request);
        ndviInitService.initNdviHistoryIfAbsent(request);
    }

    /**
     * Сброс истории NDVI для поля (удаляет все записи).
     * DELETE /api/ndvi/fields/{fieldId}/cache
     */
    @DeleteMapping("/fields/{fieldId}/cache")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearNdviCache(@PathVariable Long fieldId) {
        log.info("Clearing NDVI cache for field {}", fieldId);
        ndviService.clearCache(fieldId);
    }
}
