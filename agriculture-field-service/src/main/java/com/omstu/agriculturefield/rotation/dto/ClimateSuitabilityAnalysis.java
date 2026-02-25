package com.omstu.agriculturefield.rotation.dto;

import java.util.List;
import java.util.Map;

/**
 * Анализ климатической пригодности культуры для региона.
 * Сравнивает исторические агрометрики с требованиями культуры.
 */
public record ClimateSuitabilityAnalysis(
        Long cropTypeId,
        String cropTypeName,
        String regionName,
        Integer analyzedYears,

        // Общий вердикт
        SuitabilityVerdict verdict,
        double overallScore, // 0.0 - 1.0

        // Детализация по периодам
        List<PeriodAnalysis> periodAnalyses,

        // Ключевые риски
        List<ClimateRisk> risks,

        // Рекомендация
        String recommendation,

        // Исторические данные (усредненные)
        HistoricalClimateProfile historicalProfile
) {
    public enum SuitabilityVerdict {
        HIGHLY_SUITABLE,    // Отлично подходит (score > 0.8)
        SUITABLE,           // Подходит (score 0.6-0.8)
        MARGINAL,           // С рисками (score 0.4-0.6)
        UNSUITABLE          // Не рекомендуется (score < 0.4)
    }

    public record PeriodAnalysis(
            String period,           // "Октябрь-Март", "Апрель-Май", etc.
            String parameter,        // "Осадки", "Температура", "ГТК"
            double requiredMin,
            double requiredMax,
            double actualAvg,        // Среднее за analyzedYears
            double matchScore,       // 0.0 - 1.0
            String status            // "OPTIMAL", "ACCEPTABLE", "STRESS", "CRITICAL"
    ) {}

    public record ClimateRisk(
            String riskType,         // "DROUGHT", "FROST", "HEAT_STRESS", "WATER_EXCESS"
            String description,
            double probability,      // Вероятность за сезон (0.0 - 1.0)
            String mitigation        // Как минимизировать
    ) {}

    public record HistoricalClimateProfile(
            Double avgPrecipitationAprSep,    // Средние осадки за вегетацию
            Double avgTempSumAprSep,          // Сумма температур
            Double avgGtkAprSep,              // Средний ГТК
            Integer avgHeatStressDays,        // Среднее число дней жары
            Integer maxLongestDryPeriod,      // Максимальная засуха за период
            Double minTempWinter,             // Самая холодная зима
            Boolean frostRiskSpring           // Был ли риск заморозков
    ) {}
}
