package com.omstu.agriculturefield.protection.client;

import com.omstu.agriculturefield.protection.dto.NdviSnapshotDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

// запрашивает NDVI за 10 дней и вычисляет delta для ML-пейлоада
@Component
@Slf4j
public class NdviSnapshotClient {

    private final WebClient webClient;

    public NdviSnapshotClient(@Qualifier("ndviWebClient") WebClient webClient) {
        this.webClient = webClient;
    }

    public Mono<NdviSnapshotDto> getNdviSnapshot(Long fieldId, List<List<Double>> coordinates) {
        LocalDate today = LocalDate.now();
        LocalDate tenDaysAgo = today.minusDays(10);

        Map<String, Object> request = Map.of(
                "fieldId", fieldId,
                "coordinates", coordinates,
                "dateStart", tenDaysAgo.toString(),
                "dateEnd", today.toString()
        );

        return webClient.post()
                .uri("/api/ndvi/history/auto")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(NdviHistoryRaw.class)
                .map(NdviSnapshotClient::buildSnapshot)
                .onErrorResume(ex -> {
                    log.warn("NDVI snapshot unavailable for field {}: {}", fieldId, ex.getMessage());
                    return Mono.just(new NdviSnapshotDto(null, null, null, null, "UNAVAILABLE"));
                });
    }

    private static NdviSnapshotDto buildSnapshot(NdviHistoryRaw raw) {
        if (raw == null || raw.current() == null) {
            return new NdviSnapshotDto(null, null, null, null, "UNAVAILABLE");
        }

        NdviRecordRaw current = raw.current();
        Double currentNdvi = current.mean();
        LocalDate currentDate = current.date();

        Double baselineNdvi = null;
        if (raw.history() != null && !raw.history().isEmpty() && currentDate != null) {
            baselineNdvi = raw.history().stream()
                    .filter(r -> r.date() != null && r.mean() != null)
                    .min((a, b) -> {
                        long diffA = Math.abs(ChronoUnit.DAYS.between(a.date(), currentDate) - 10);
                        long diffB = Math.abs(ChronoUnit.DAYS.between(b.date(), currentDate) - 10);
                        return Long.compare(diffA, diffB);
                    })
                    .map(NdviRecordRaw::mean)
                    .orElse(null);
        }

        Double delta = (currentNdvi != null && baselineNdvi != null)
                ? Math.round((currentNdvi - baselineNdvi) * 1000.0) / 1000.0
                : null;

        return new NdviSnapshotDto(currentNdvi, currentDate, baselineNdvi, delta, current.source());
    }

    // Local mirrors of ndvi-service DTOs

    private record NdviRecordRaw(
            Long fieldId,
            LocalDate date,
            Double mean,
            Double min,
            Double max,
            Double std,
            String source) {
    }

    private record NdviHistoryRaw(
            Long fieldId,
            String fieldName,
            NdviRecordRaw current,
            List<NdviRecordRaw> history) {
    }
}
