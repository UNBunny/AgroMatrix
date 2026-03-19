package com.omstu.ndvi.service;

import com.omstu.ndvi.dto.NdviFieldRequest;
import com.omstu.ndvi.repository.NdviRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NdviInitService {

    private final NdviService ndviService;
    private final NdviRecordRepository ndviRecordRepository;

    /**
     * Асинхронно загружает историю NDVI за 12 месяцев из GEE и сохраняет в БД,
     * если в БД нет ни одной записи для данного поля.
     * Вызывается при создании поля в agriculture-field-service через API ndvi-service.
     */
    @Async
    public void initNdviHistoryIfAbsent(NdviFieldRequest request) {
        boolean hasAny = !ndviRecordRepository.findByFieldIdOrderByRecordDateDesc(request.fieldId()).isEmpty();
        if (hasAny) {
            log.debug("NDVI records already exist for field {}, skipping init", request.fieldId());
            return;
        }

        LocalDate to = LocalDate.now();
        LocalDate from = to.minusMonths(12);
        log.info("Initializing NDVI history from GEE for new field {} ({} — {})", request.fieldId(), from, to);

        NdviFieldRequest initRequest = new NdviFieldRequest(
                request.fieldId(),
                request.fieldName(),
                request.coordinates(),
                from,
                to
        );

        try {
            ndviService.fetchSatelliteHistory(initRequest);
        } catch (Exception e) {
            log.warn("Failed to initialize NDVI history for field {}: {}", request.fieldId(), e.getMessage());
        }
    }

    /**
     * Проверяет, есть ли хотя бы одна запись NDVI для поля.
     */
    public boolean hasRecords(Long fieldId) {
        return !ndviRecordRepository.findByFieldIdOrderByRecordDateDesc(fieldId).isEmpty();
    }

    /**
     * Возвращает список всех fieldId, для которых есть записи NDVI.
     */
    public List<Long> getAllTrackedFieldIds() {
        return ndviRecordRepository.findAll().stream()
                .map(r -> r.getFieldId())
                .distinct()
                .toList();
    }
}
