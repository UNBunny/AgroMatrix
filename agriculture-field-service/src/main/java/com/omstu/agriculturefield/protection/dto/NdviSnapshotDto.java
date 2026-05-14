package com.omstu.agriculturefield.protection.dto;

import java.time.LocalDate;

public record NdviSnapshotDto(
        Double currentNdvi,
        LocalDate currentDate,
        Double baselineNdvi,
        Double ndviDelta,
        String source) {
}
