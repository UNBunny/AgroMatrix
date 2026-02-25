package com.omstu.agriculturefield.rotation.dto;

import java.util.List;

public record CropRecommendationItem(
        Long cropTypeId,
        String cropTypeName,
        Boolean rotationCompliant,
        String rotationViolationReason,
        Double predictedYieldCentnersPerHa,
        Double predictedPriceRubPerTon,
        Double estimatedProfitRubPerHa,
        Integer rank,
        Double soilCompatibilityScore,

        // Итоговый балл [0..100]
        Integer totalScore,

        // Разбивка по факторам — объясняет агроному почему такой балл
        ScoreBreakdown scoreBreakdown,

        // Рекомендуемые сорта для этой культуры
        List<VarietyRecommendation> recommendedVarieties,

        // Текстовое резюме для агронома
        String agronomistSummary,

        // Рекомендуемое окно посева (с учётом климата и прогноза)
        SowingWindow sowingWindow
) {
    public record ScoreBreakdown(
            FactorScore rotation,      // Севооборот (30%)
            FactorScore soil,          // Совместимость с почвой (25%)
            FactorScore climate,       // Климатические условия (25%)
            FactorScore economics      // Экономическая эффективность (20%)
    ) {}

    public record FactorScore(
            int score,           // 0-100
            double weight,       // Вес фактора в итоговом балле
            String status,       // "EXCELLENT", "GOOD", "WARNING", "CRITICAL"
            String explanation   // Объяснение на русском языке
    ) {}

    public record VarietyRecommendation(
            String name,
            String seedProducer,
            String origin,              // "РФ", "Казахстан", "Германия", "Франция"
            String droughtTolerance,    // "ВЫСОКАЯ", "СРЕДНЯЯ", "НИЗКАЯ"
            String frostTolerance,
            Integer maturationDays,
            String recommendedRegions,  // Регионы допуска
            String whyRecommended,      // Почему подходит именно сейчас
            boolean isTopByArea         // Входит в топ по площади высева в РФ
    ) {}
}
