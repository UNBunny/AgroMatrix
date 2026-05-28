package com.omstu.agriculturefield.field.kafka;

import java.util.List;

public record FieldCreatedEvent(
        Long fieldId,
        String fieldName,
        List<List<Double>> coordinates
) {}
