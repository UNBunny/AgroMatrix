package com.omstu.agriculturefield.report.dto;

import java.math.BigDecimal;
import java.util.List;

public record FieldReportResponse(
        FieldReportMetrics metrics,
        List<TimelinePoint> timeline
) {
    public record FieldReportMetrics(
            Long fieldId,
            String fieldName,
            String cropType,
            String status,
            Double areaHectares,
            int totalFertilizerApplications,
            int totalProtectionOperations,
            BigDecimal totalFertilizerKg,
            BigDecimal actualYieldKg,
            BigDecimal expectedYieldKg,
            String lastObservationDate,
            Integer lastBbchScale
    ) {}

    public record TimelinePoint(
            String date,
            BigDecimal fertilizerKg,
            Integer protectionOps,
            Integer bbchScale,
            Double ndviMean
    ) {}
}
