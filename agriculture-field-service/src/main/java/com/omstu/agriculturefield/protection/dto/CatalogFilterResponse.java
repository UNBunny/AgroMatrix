package com.omstu.agriculturefield.protection.dto;

import java.util.List;

// результат фильтрации: воронка afterBbch → afterType → afterTemp → FRAC-дедупликация
public record CatalogFilterResponse(
        String cropCode,
        Integer bbchStage,
        String appliedDiseaseType,
        int totalCandidates,
        int afterBbchFilter,
        int afterTypeFilter,
        int afterTempFilter,
        int finalCount,
        List<ProductRecommendationDto> recommendations,
        List<String> fracsRepresented,
        String filterSummary) {
}
