package com.omstu.agriculturefield.crop.dto;

import com.omstu.agriculturefield.crop.model.enums.ApplicationMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FertilizerApplicationRequest(
        @NotNull Long cropHistoryId,
        @NotNull LocalDate applicationDate,
        @NotBlank String fertilizerType,
        String formulation,
        @PositiveOrZero Double doseKgPerHa,
        @PositiveOrZero Double totalAreaHa,
        @PositiveOrZero Double totalAmountKg,
        ApplicationMethod applicationMethod,
        // BBCH шкала 0-99
        @Min(0) @Max(99) Integer bbchPhase,
        @DecimalMin("0.0") BigDecimal costPerHa,
        @DecimalMin("0.0") BigDecimal totalCost,
        Double weatherTempC,
        // влажность в процентах
        @Min(0) @Max(100) Integer weatherHumidity,
        @PositiveOrZero Double windSpeed,
        String notes
) {}
