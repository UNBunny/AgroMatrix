package com.omstu.agriculturefield.field.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class FieldEventProducer {

    private final KafkaTemplate<String, FieldCreatedEvent> kafkaTemplate;

    @Value("${kafka.topics.field-created:field.created}")
    private String fieldCreatedTopic;

    public void sendFieldCreated(FieldCreatedEvent event) {
        kafkaTemplate.send(fieldCreatedTopic, String.valueOf(event.fieldId()), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.warn("Failed to send FieldCreatedEvent for fieldId={}: {}", event.fieldId(), ex.getMessage());
                    } else {
                        log.info("FieldCreatedEvent sent for fieldId={}, partition={}, offset={}",
                                event.fieldId(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    }
                });
    }
}
