package com.omstu.agriculturefield.protection.dto;

import java.util.List;

public record ProtectionAnalysisPayload(
        Long fieldId,
        String cropCode,
        Integer bbchStage,
        List<String> targetDiseases,
        WeatherWindowDto weatherData,
        NdviSnapshotDto ndviData,
        List<CropProtectionEntryDto> catalogEntries) {
}
