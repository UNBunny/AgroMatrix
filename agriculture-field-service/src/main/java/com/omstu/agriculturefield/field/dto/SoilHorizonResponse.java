package com.omstu.agriculturefield.field.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record SoilHorizonResponse(
        Long id,
        Long fieldId,
        String fieldName,
        Integer depthFromCm,
        Integer depthToCm,
        Double nitrogenN,
        Double phosphorusP,
        Double potassiumK,
        Double phLevel,
        Double bulkDensity,
        Double organicMatter,
        LocalDate samplingDate,
        String labProtocol,
        String notes,
        LocalDateTime createdAt
) {}
