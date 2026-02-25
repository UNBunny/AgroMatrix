package com.omstu.agriculturefield.field.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SoilHorizonRequest(
        @NotNull Long fieldId,
        @NotNull @Min(0) Integer depthFromCm,
        @NotNull @Min(1) @Max(100) Integer depthToCm,
        Double nitrogenN,
        Double phosphorusP,
        Double potassiumK,
        Double phLevel,
        Double bulkDensity,
        Double organicMatter,
        LocalDate samplingDate,
        String labProtocol,
        String notes
) {}
