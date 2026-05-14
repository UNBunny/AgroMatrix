package com.omstu.agriculturefield.field.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

// ndvi-service не знает о полях, поэтому передаём координаты с каждым запросом
@Component
@Slf4j
public class NdviServiceClient {

    private final WebClient webClient;

    public NdviServiceClient(@Qualifier("ndviWebClient") WebClient webClient) {
        this.webClient = webClient;
    }

    // fire-and-forget — вызываем после создания поля, не ждём ответа
    public void initNdviHistoryAsync(Long fieldId, String fieldName, List<List<Double>> coordinates) {
        Map<String, Object> body = Map.of(
                "fieldId", fieldId,
                "fieldName", fieldName != null ? fieldName : "",
                "coordinates", coordinates,
                "dateStart", LocalDate.now().minusMonths(12).toString(),
                "dateEnd", LocalDate.now().toString()
        );

        webClient.post()
                .uri("/api/ndvi/init")
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .subscribe(
                        response -> log.info("NDVI init triggered for field {}", fieldId),
                        error -> log.warn("Failed to trigger NDVI init for field {}: {}", fieldId, error.getMessage())
                );
    }
}
