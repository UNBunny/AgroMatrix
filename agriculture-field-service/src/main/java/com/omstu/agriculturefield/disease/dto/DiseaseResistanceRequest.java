package com.omstu.agriculturefield.disease.dto;

import com.omstu.agriculturefield.disease.model.enums.ResistanceLevel;
import jakarta.validation.constraints.NotNull;

public record DiseaseResistanceRequest(
        @NotNull Long diseaseId,
        @NotNull Long cropVarietyId,
        @NotNull ResistanceLevel resistanceLevel
) {}
