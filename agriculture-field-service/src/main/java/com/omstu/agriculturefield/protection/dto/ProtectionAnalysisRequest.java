package com.omstu.agriculturefield.protection.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ProtectionAnalysisRequest(
        @NotNull Long fieldId,
        @Min(0) @Max(99) Integer bbchStage,
        List<String> targetDiseases) {
}
