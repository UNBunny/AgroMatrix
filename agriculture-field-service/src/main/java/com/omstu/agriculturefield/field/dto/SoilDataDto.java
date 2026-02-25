package com.omstu.agriculturefield.field.dto;

import com.omstu.agriculturefield.field.model.SoilData;

import java.time.LocalDateTime;

public record SoilDataDto(
        Long id,
        Long fieldId,
        Double nitrogenN,
        Double phosphorusP,
        Double potassiumK,
        Double phLevel,
        Double organicMatter,
        String soilTexture,
        Double cec,
        Double bulkDensity,
        SoilData.SoilDataSource source,
        Double confidence,
        String soilgridsVersion,
        LocalDateTime lastSyncedAt,
        LocalDateTime updatedAt,
        String notes
) {}
