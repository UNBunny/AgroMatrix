package com.omstu.ndvi.kafka;

import com.omstu.ndvi.dto.NdviFieldRequest;
import com.omstu.ndvi.service.NdviInitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class FieldCreatedEventConsumer {

    private final NdviInitService ndviInitService;

    @KafkaListener(
            topics = "${kafka.topics.field-created:field.created}",
            groupId = "${spring.kafka.consumer.group-id:ndvi-service-group}",
            containerFactory = "fieldCreatedKafkaListenerContainerFactory"
    )
    public void onFieldCreated(FieldCreatedEvent event) {
        log.info("Received FieldCreatedEvent for fieldId={}", event.fieldId());

        NdviFieldRequest request = new NdviFieldRequest(
                event.fieldId(),
                event.fieldName(),
                event.coordinates(),
                LocalDate.now().minusMonths(12),
                LocalDate.now()
        );

        ndviInitService.initNdviHistoryIfAbsent(request);
    }
}
