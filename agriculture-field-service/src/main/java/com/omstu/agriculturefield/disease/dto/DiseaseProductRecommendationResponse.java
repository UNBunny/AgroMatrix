package com.omstu.agriculturefield.disease.dto;

import java.util.List;

public record DiseaseProductRecommendationResponse(
        Long id,
        String opType,
        String opLabel,
        String opColor,
        String opEmoji,
        String reason,
        List<DiseaseProductItemResponse> products
) {}
