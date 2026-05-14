package com.omstu.agriculturefield.rotation.service;

import com.omstu.agriculturefield.crop.model.CropType;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.rotation.dto.ClimateSuitabilityAnalysis;
import com.omstu.agriculturefield.rotation.dto.SeasonalWeatherDto;
import com.omstu.agriculturefield.rotation.service.impl.RotationRecommendationServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Year;
import java.util.ArrayList;
import java.util.List;

// анализ пригодности культуры: загружаем ERA5 за N лет, сравниваем с агрономическими требованиями культуры
@Service
@Slf4j
@RequiredArgsConstructor
public class CropClimateSuitabilityService {

    @Qualifier("weatherWebClient")
    private final WebClient weatherWebClient;

    private final GeocodingService geocodingService;

    private static final int DEFAULT_HISTORY_YEARS = 10;
    private static final int MAX_HISTORY_YEARS = 30;
    private static final int MIN_SEASONAL_YEAR = 1991;

    public ClimateSuitabilityAnalysis analyzeSuitability(
            AgriculturalField field,
            CropType cropType,
            Integer yearsCount) {

        int years = Math.min(yearsCount != null ? yearsCount : DEFAULT_HISTORY_YEARS, MAX_HISTORY_YEARS);
        int currentYear = Year.now().getValue();
        int startYear = Math.max(currentYear - years, MIN_SEASONAL_YEAR);

        log.info("Analyzing climate suitability for crop {} on field {} over {} years ({}-{})",
                cropType.getName(), field.getId(), years, startYear, currentYear - 1);

        // Собираем исторические данные за несколько лет (ERA5 через archive-api.open-meteo.com)
        List<SeasonalWeatherDto> historicalData = fetchHistoricalData(field, startYear, currentYear - 1);

        if (historicalData.isEmpty()) {
            log.warn("No historical weather data available for field {}", field.getId());
            return buildNoDataAnalysis(cropType);
        }

        // Усредняем показатели
        HistoricalMetrics avg = calculateAverages(historicalData);

        // Анализируем по периодам
        List<ClimateSuitabilityAnalysis.PeriodAnalysis> periodAnalyses = analyzePeriods(cropType, avg, historicalData);

        // Оцениваем риски
        List<ClimateSuitabilityAnalysis.ClimateRisk> risks = assessRisks(cropType, avg, historicalData);

        // Считаем общий балл
        double overallScore = calculateOverallScore(periodAnalyses, risks);

        // Формируем вердикт
        ClimateSuitabilityAnalysis.SuitabilityVerdict verdict = determineVerdict(overallScore, risks);

        // Строим рекомендацию
        String recommendation = buildRecommendation(cropType, verdict, risks, avg);

        return new ClimateSuitabilityAnalysis(
                cropType.getId(),
                cropType.getName(),
                resolveRegionName(field),
                historicalData.size(),
                verdict,
                overallScore,
                periodAnalyses,
                risks,
                recommendation,
                buildHistoricalProfile(avg)
        );
    }

    private List<SeasonalWeatherDto> fetchHistoricalData(AgriculturalField field, int startYear, int endYear) {
        List<SeasonalWeatherDto> data = new ArrayList<>();
        double lat = field.getGeom().getCentroid().getY();
        double lon = field.getGeom().getCentroid().getX();

        for (int year = startYear; year <= endYear; year++) {
            final int currentYear = year;
            try {
                SeasonalWeatherDto metrics = weatherWebClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/api/agro-data/seasonal")
                                .queryParam("lat", lat)
                                .queryParam("lon", lon)
                                .queryParam("year", currentYear)
                                .build())
                        .retrieve()
                        .bodyToMono(SeasonalWeatherDto.class)
                        .block();

                if (metrics != null) {
                    data.add(metrics);
                }
            } catch (Exception e) {
                log.warn("Failed to fetch weather data for year {}: {}", year, e.getMessage());
            }
        }

        return data;
    }

    private HistoricalMetrics calculateAverages(List<SeasonalWeatherDto> data) {
        return new HistoricalMetrics(
                data.stream().mapToDouble(d -> d.precipOctMar() != null ? d.precipOctMar() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.minTempWinter() != null ? d.minTempWinter() : 0).min().orElse(0),
                data.stream().mapToDouble(d -> d.precipAprMay() != null ? d.precipAprMay() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.tempSumAprMay() != null ? d.tempSumAprMay() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.gtkAprMay() != null ? d.gtkAprMay() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.precipJunJul() != null ? d.precipJunJul() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.tempSumJunJul() != null ? d.tempSumJunJul() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.heatStressJunJul() != null ? d.heatStressJunJul() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.avgTempJunJul() != null ? d.avgTempJunJul() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.gtkJunJul() != null ? d.gtkJunJul() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.precipAugSep() != null ? d.precipAugSep() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.tempSumAugSep() != null ? d.tempSumAugSep() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.gtkAprSep() != null ? d.gtkAprSep() : 0).average().orElse(0),
                data.stream().mapToDouble(d -> d.tempSumAprSep() != null ? d.tempSumAprSep() : 0).average().orElse(0),
                (int) Math.round(data.stream().mapToInt(d -> d.totalHeatStressDays() != null ? d.totalHeatStressDays() : 0).average().orElse(0)),
                (int) Math.round(data.stream().mapToInt(d -> d.longestDryPeriod() != null ? d.longestDryPeriod() : 0).average().orElse(0)),
                data.stream().filter(d -> d.frostRiskSpring() != null && d.frostRiskSpring()).count() >= Math.max(1, data.size() / 3)
        );
    }

    private List<ClimateSuitabilityAnalysis.PeriodAnalysis> analyzePeriods(
            CropType cropType, HistoricalMetrics avg, List<SeasonalWeatherDto> historicalData) {

        List<ClimateSuitabilityAnalysis.PeriodAnalysis> analyses = new ArrayList<>();

        // Требования культуры (агрономические нормы)
        double waterNeed = cropType.getWaterRequirementsMm() != null ? cropType.getWaterRequirementsMm().doubleValue() : 300;
        double tempMin = cropType.getOptimalTemperatureMin() != null ? cropType.getOptimalTemperatureMin().doubleValue() : 10;
        double tempMax = cropType.getOptimalTemperatureMax() != null ? cropType.getOptimalTemperatureMax().doubleValue() : 25;

        // 1. Зимний период (для озимых)
        if (isWinterCrop(cropType)) {
            analyses.add(new ClimateSuitabilityAnalysis.PeriodAnalysis(
                    "Октябрь-Март",
                    "Осадки (накопление влаги)",
                    150,  // Минимум для озимых
                    400,  // Максимум
                    avg.precipOctMar,
                    scoreRange(avg.precipOctMar, 150, 400),
                    statusFromScore(scoreRange(avg.precipOctMar, 150, 400))
            ));

            analyses.add(new ClimateSuitabilityAnalysis.PeriodAnalysis(
                    "Октябрь-Март",
                    "Мин. температура зимой",
                    -25,  // Критический минимум
                    -5,   // Норма
                    avg.minTempWinter,
                    scoreWinterTemp(avg.minTempWinter),
                    statusFromWinterTemp(avg.minTempWinter)
            ));
        }

        // 2. Весенний старт
        analyses.add(new ClimateSuitabilityAnalysis.PeriodAnalysis(
                "Апрель-Май",
                "Осадки",
                waterNeed * 0.15,  // ~15% от годовой нормы
                waterNeed * 0.35,
                avg.precipAprMay,
                scoreRange(avg.precipAprMay, waterNeed * 0.15, waterNeed * 0.35),
                statusFromScore(scoreRange(avg.precipAprMay, waterNeed * 0.15, waterNeed * 0.35))
        ));

        analyses.add(new ClimateSuitabilityAnalysis.PeriodAnalysis(
                "Апрель-Май",
                "Сумма температур",
                tempMin * 60,  // Минимум для старта
                tempMax * 60,
                avg.tempSumAprMay,
                scoreRange(avg.tempSumAprMay, tempMin * 60, tempMax * 60),
                statusFromScore(scoreRange(avg.tempSumAprMay, tempMin * 60, tempMax * 60))
        ));

        // 3. Критический период (Июнь-Июль)
        analyses.add(new ClimateSuitabilityAnalysis.PeriodAnalysis(
                "Июнь-Июль",
                "Осадки",
                waterNeed * 0.30,
                waterNeed * 0.50,
                avg.precipJunJul,
                scoreRange(avg.precipJunJul, waterNeed * 0.30, waterNeed * 0.50),
                statusFromScore(scoreRange(avg.precipJunJul, waterNeed * 0.30, waterNeed * 0.50))
        ));

        analyses.add(new ClimateSuitabilityAnalysis.PeriodAnalysis(
                "Июнь-Июль",
                "ГТК (гидротермический коэфф.)",
                0.8,   // Минимум для роста
                1.5,   // Оптимум
                avg.gtkJunJul,
                scoreRange(avg.gtkJunJul, 0.8, 1.5),
                statusFromScore(scoreRange(avg.gtkJunJul, 0.8, 1.5))
        ));

        // 4. Полный сезон
        analyses.add(new ClimateSuitabilityAnalysis.PeriodAnalysis(
                "Апрель-Сентябрь",
                "Общие осадки",
                waterNeed * 0.8,
                waterNeed * 1.5,
                avg.precipAprMay + avg.precipJunJul + avg.precipAugSep,
                scoreRange(avg.precipAprMay + avg.precipJunJul + avg.precipAugSep,
                          waterNeed * 0.8, waterNeed * 1.5),
                statusFromScore(scoreRange(avg.precipAprMay + avg.precipJunJul + avg.precipAugSep,
                          waterNeed * 0.8, waterNeed * 1.5))
        ));

        return analyses;
    }

    private List<ClimateSuitabilityAnalysis.ClimateRisk> assessRisks(
            CropType cropType, HistoricalMetrics avg, List<SeasonalWeatherDto> historicalData) {

        List<ClimateSuitabilityAnalysis.ClimateRisk> risks = new ArrayList<>();

        // Риск засухи
        double droughtProbability = historicalData.stream()
                .filter(d -> d.gtkJunJul() != null && d.gtkJunJul() < 0.8)
                .count() / (double) historicalData.size();

        if (droughtProbability > 0.3) {
            risks.add(new ClimateSuitabilityAnalysis.ClimateRisk(
                    "DROUGHT",
                    "Вероятность засухи в критический период (ГТК < 0.8)",
                    droughtProbability,
                    "Выбрать засухоустойчивый сорт, увеличить норму высева, применить антистрессанты"
            ));
        }

        // Риск жарового стресса
        double heatStressProbability = historicalData.stream()
                .filter(d -> d.totalHeatStressDays() != null && d.totalHeatStressDays() > 10)
                .count() / (double) historicalData.size();

        if (heatStressProbability > 0.2) {
            risks.add(new ClimateSuitabilityAnalysis.ClimateRisk(
                    "HEAT_STRESS",
                    "Вероятность жарового стресса (>10 дней с T>30°C)",
                    heatStressProbability,
                    "Выбрать жароустойчивый сорт, планировать полив в критический период"
            ));
        }

        // Риск весенних заморозков (для теплолюбивых)
        if (cropType.getOptimalTemperatureMin() != null && cropType.getOptimalTemperatureMin().doubleValue() > 12) {
            double frostProbability = historicalData.stream()
                    .filter(d -> d.frostRiskSpring() != null && d.frostRiskSpring())
                    .count() / (double) historicalData.size();

            if (frostProbability > 0.15) {
                risks.add(new ClimateSuitabilityAnalysis.ClimateRisk(
                        "FROST",
                        "Риск весенних заморозков для теплолюбивой культуры",
                        frostProbability,
                        "Отложить сев на более поздние сроки, использовать укрывной материал"
                ));
            }
        }

        // Риск зимнего вымерзания (для озимых)
        if (isWinterCrop(cropType)) {
            double freezeRisk = historicalData.stream()
                    .filter(d -> d.minTempWinter() != null && d.minTempWinter() < -25)
                    .count() / (double) historicalData.size();

            if (freezeRisk > 0.1) {
                risks.add(new ClimateSuitabilityAnalysis.ClimateRisk(
                        "FROST",
                        "Риск зимнего вымерзания озимых (T < -25°C)",
                        freezeRisk,
                        "Использовать зимостойкие сорта, увеличить снегозадержание"
                ));
            }
        }

        return risks;
    }

    private double calculateOverallScore(
            List<ClimateSuitabilityAnalysis.PeriodAnalysis> periodAnalyses,
            List<ClimateSuitabilityAnalysis.ClimateRisk> risks) {

        double periodScore = periodAnalyses.stream()
                .mapToDouble(ClimateSuitabilityAnalysis.PeriodAnalysis::matchScore)
                .average()
                .orElse(0.5);

        // Штраф за риски
        double riskPenalty = risks.stream()
                .mapToDouble(r -> r.probability() * 0.15)
                .sum();

        return Math.max(0.0, Math.min(1.0, periodScore - riskPenalty));
    }

    private ClimateSuitabilityAnalysis.SuitabilityVerdict determineVerdict(double score, List<ClimateSuitabilityAnalysis.ClimateRisk> risks) {
        if (score > 0.8) return ClimateSuitabilityAnalysis.SuitabilityVerdict.HIGHLY_SUITABLE;
        if (score > 0.6) return ClimateSuitabilityAnalysis.SuitabilityVerdict.SUITABLE;
        if (score > 0.4) return ClimateSuitabilityAnalysis.SuitabilityVerdict.MARGINAL;
        return ClimateSuitabilityAnalysis.SuitabilityVerdict.UNSUITABLE;
    }

    private String buildRecommendation(CropType cropType,
                                       ClimateSuitabilityAnalysis.SuitabilityVerdict verdict,
                                       List<ClimateSuitabilityAnalysis.ClimateRisk> risks,
                                       HistoricalMetrics avg) {

        StringBuilder sb = new StringBuilder();

        switch (verdict) {
            case HIGHLY_SUITABLE -> sb.append("✅ Культура отлично подходит для данного региона. ");
            case SUITABLE -> sb.append("✓ Культура подходит для выращивания. ");
            case MARGINAL -> sb.append("⚠ Культура можно выращивать, но с оговорками. ");
            case UNSUITABLE -> sb.append("❌ Культура не рекомендуется для данного региона. ");
        }

        if (!risks.isEmpty()) {
            sb.append("Основные риски: ");
            risks.forEach(r -> sb.append(r.description()).append(" (").append(String.format("%.0f%%", r.probability() * 100)).append("). "));
        }

        // Добавляем агрономические советы
        if (avg.gtkJunJul < 0.8) {
            sb.append("Рекомендуется выбрать засухоустойчивый сорт. ");
        }
        if (avg.totalHeatStressDays > 8) {
            sb.append("В критический период возможен жаровой стресс — планируйте полив. ");
        }

        return sb.toString();
    }

    private ClimateSuitabilityAnalysis.HistoricalClimateProfile buildHistoricalProfile(HistoricalMetrics avg) {
        return new ClimateSuitabilityAnalysis.HistoricalClimateProfile(
                avg.precipAprMay + avg.precipJunJul + avg.precipAugSep,
                avg.tempSumAprSep,
                avg.gtkAprSep,
                (int) avg.totalHeatStressDays,
                avg.longestDryPeriod,
                avg.minTempWinter,
                avg.frostRiskSpring
        );
    }

    private ClimateSuitabilityAnalysis buildNoDataAnalysis(CropType cropType) {
        return new ClimateSuitabilityAnalysis(
                cropType.getId(),
                cropType.getName(),
                null,
                0,
                ClimateSuitabilityAnalysis.SuitabilityVerdict.MARGINAL,
                0.5,
                List.of(),
                List.of(),
                "Нет данных о климате региона. Рекомендуется провести анализ вручную.",
                null
        );
    }

    private String resolveRegionName(AgriculturalField field) {
        if (field.getRegionName() != null && !field.getRegionName().isBlank()) {
            return field.getRegionName();
        }
        try {
            double lat = field.getGeom().getCentroid().getY();
            double lon = field.getGeom().getCentroid().getX();
            return geocodingService.resolveRegionName(lat, lon);
        } catch (Exception e) {
            return "Неизвестный регион";
        }
    }

    // Вспомогательные методы
    private boolean isWinterCrop(String cropName) {
        return cropName.toLowerCase().contains("озим");
    }

    private boolean isWinterCrop(com.omstu.agriculturefield.crop.model.CropType cropType) {
        if (cropType.getMlCropCode() != null) {
            return cropType.getMlCropCode().startsWith("winter_");
        }
        return isWinterCrop(cropType.getName());
    }

    private double scoreRange(double value, double min, double max) {
        if (value >= min && value <= max) return 1.0;
        double center = (min + max) / 2;
        double tolerance = (max - min) / 2;
        double deviation = Math.abs(value - center);
        return Math.max(0, 1.0 - (deviation - tolerance) / (tolerance * 0.5));
    }

    private double scoreWinterTemp(double temp) {
        if (temp > -15) return 1.0;  // Отличная зима
        if (temp > -20) return 0.8;  // Норма
        if (temp > -25) return 0.5;  // Риск
        return Math.max(0, 0.3 - (Math.abs(temp) - 25) * 0.02);
    }

    private String statusFromScore(double score) {
        if (score >= 0.9) return "OPTIMAL";
        if (score >= 0.7) return "ACCEPTABLE";
        if (score >= 0.4) return "STRESS";
        return "CRITICAL";
    }

    private String statusFromWinterTemp(double temp) {
        if (temp > -15) return "OPTIMAL";
        if (temp > -20) return "ACCEPTABLE";
        if (temp > -25) return "STRESS";
        return "CRITICAL";
    }

    // Внутренний класс для усредненных метрик
    private record HistoricalMetrics(
            double precipOctMar,
            double minTempWinter,
            double precipAprMay,
            double tempSumAprMay,
            double gtkAprMay,
            double precipJunJul,
            double tempSumJunJul,
            double heatStressJunJul,
            double avgTempJunJul,
            double gtkJunJul,
            double precipAugSep,
            double tempSumAugSep,
            double gtkAprSep,
            double tempSumAprSep,
            int totalHeatStressDays,
            int longestDryPeriod,
            boolean frostRiskSpring
    ) {}
}
