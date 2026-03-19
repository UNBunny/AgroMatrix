package com.omstu.ndvi.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/**
 * Запрос на операцию с NDVI для поля.
 * Координаты передаются клиентом (agriculture-field-service), чтобы ndvi-service
 * не зависел от БД полей.
 */
public record NdviFieldRequest(
        @NotNull Long fieldId,
        String fieldName,
        @NotEmpty List<List<Double>> coordinates,
        @NotNull @JsonFormat(pattern = "yyyy-MM-dd") LocalDate dateStart,
        @NotNull @JsonFormat(pattern = "yyyy-MM-dd") LocalDate dateEnd
) {}
