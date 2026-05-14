package com.omstu.agriculturefield.protection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record ThreatAnalysisResponse(
        @JsonProperty("risk_level")               String riskLevel,
        @JsonProperty("infection_index")           Double infectionIndex,
        @JsonProperty("ndvi_corrected_index")      Double ndviCorrectedIndex,
        @JsonProperty("nitrogen_overload_warning") String nitrogenOverloadWarning,
        @JsonProperty("active_threats")            List<String> activeThreats,
        @JsonProperty("recommendations")           List<ThreatRecommendation> recommendations,
        @JsonProperty("fracs_used_recently")       List<String> fracsUsedRecently,
        @JsonProperty("analysis_notes")            String analysisNotes) {
}
