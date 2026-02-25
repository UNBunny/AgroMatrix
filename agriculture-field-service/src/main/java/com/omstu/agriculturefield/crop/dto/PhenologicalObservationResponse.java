package com.omstu.agriculturefield.crop.dto;

import com.omstu.agriculturefield.crop.model.enums.ObservationMethod;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PhenologicalObservationResponse(
        Long id,
        Long cropHistoryId,
        String cropTypeName,
        String fieldName,
        LocalDate observationDate,
        Integer bbchScale,
        String bbchDescription,
        ObservationMethod observationMethod,
        String notes,
        String weatherConditions,
        LocalDateTime createdAt
) {}
