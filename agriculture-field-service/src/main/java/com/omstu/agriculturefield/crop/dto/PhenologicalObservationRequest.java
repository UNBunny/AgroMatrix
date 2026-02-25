package com.omstu.agriculturefield.crop.dto;

import com.omstu.agriculturefield.crop.model.enums.ObservationMethod;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PhenologicalObservationRequest(
        @NotNull Long cropHistoryId,
        @NotNull LocalDate observationDate,
        @NotNull @Min(0) @Max(99) Integer bbchScale,
        String bbchDescription,
        ObservationMethod observationMethod,
        String notes,
        String weatherConditions
) {}
