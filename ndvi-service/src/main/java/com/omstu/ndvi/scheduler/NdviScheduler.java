package com.omstu.ndvi.scheduler;

import com.omstu.ndvi.dto.NdviFieldRequest;
import com.omstu.ndvi.service.FieldCoordinatesStore;
import com.omstu.ndvi.service.NdviService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Collection;

@Component
@Slf4j
@RequiredArgsConstructor
public class NdviScheduler {

    private final NdviService ndviService;
    private final FieldCoordinatesStore coordinatesStore;

    /**
     * Ежедневно в 06:00 обновляем NDVI для всех полей, координаты которых известны.
     */
    @Scheduled(cron = "0 0 6 * * *")
    public void scheduledNdviRefresh() {
        Collection<NdviFieldRequest> fields = coordinatesStore.getAll();
        log.info("Starting scheduled NDVI refresh for {} fields...", fields.size());

        for (NdviFieldRequest field : fields) {
            try {
                NdviFieldRequest refreshRequest = new NdviFieldRequest(
                        field.fieldId(),
                        field.fieldName(),
                        field.coordinates(),
                        LocalDate.now().minusMonths(1),
                        LocalDate.now()
                );
                ndviService.fetchSatelliteNdvi(refreshRequest);
            } catch (Exception e) {
                log.error("Failed to refresh NDVI for field {}: {}", field.fieldId(), e.getMessage());
            }
        }

        log.info("Scheduled NDVI refresh completed.");
    }
}
