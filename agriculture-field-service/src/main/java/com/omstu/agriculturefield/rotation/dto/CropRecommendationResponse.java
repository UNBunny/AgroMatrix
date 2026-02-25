package com.omstu.agriculturefield.rotation.dto;

import java.util.List;

public record CropRecommendationResponse(
        Long fieldId,
        String fieldName,
        Integer targetYear,
        List<CropRecommendationItem> recommendations,
        RecommendationMetadata metadata
) {
    public record RecommendationMetadata(
            String lastCropName,           // Последняя культура на поле
            Integer analyzedHistoryYears,  // Сколько лет истории учтено
            String soilType,               // Тип почвы (если есть)
            Double soilPh,                 // pH почвы
            String regionName,             // Регион
            String weatherDataNote,        // Откуда погода

            // Веса факторов (для прозрачности)
            String scoringMethodology      // Описание методики подбора
    ) {}
}
