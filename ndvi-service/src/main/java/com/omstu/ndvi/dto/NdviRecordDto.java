package com.omstu.ndvi.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;

public record NdviRecordDto(
        Long fieldId,
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate date,
        Double mean,
        Double min,
        Double max,
        Double std,
        String source
) {}
