package com.omstu.agriculturefield.rotation.service.impl;

import com.omstu.agriculturefield.crop.model.CropHistory;
import com.omstu.agriculturefield.crop.model.CropType;
import com.omstu.agriculturefield.crop.model.CropVariety;
import com.omstu.agriculturefield.crop.model.FertilizerApplication;
import com.omstu.agriculturefield.crop.model.PhenologicalObservation;
import com.omstu.agriculturefield.crop.model.PlantProtectionOperation;
import com.omstu.agriculturefield.crop.model.enums.ProtectionOperationType;
import com.omstu.agriculturefield.crop.model.enums.ToleranceLevel;
import com.omstu.agriculturefield.crop.repository.CropHistoryRepository;
import com.omstu.agriculturefield.crop.repository.CropTypeRepository;
import com.omstu.agriculturefield.crop.repository.CropVarietyRepository;
import com.omstu.agriculturefield.crop.repository.FertilizerApplicationRepository;
import com.omstu.agriculturefield.crop.repository.PhenologicalObservationRepository;
import com.omstu.agriculturefield.crop.repository.PlantProtectionRepository;
import com.omstu.agriculturefield.disease.dto.WeatherForecastData;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.model.SoilData;
import com.omstu.agriculturefield.field.model.SoilHorizon;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import com.omstu.agriculturefield.field.repository.SoilDataRepository;
import com.omstu.agriculturefield.field.repository.SoilHorizonRepository;
import com.omstu.agriculturefield.rotation.dto.CropRecommendationItem;
import com.omstu.agriculturefield.rotation.dto.CropRecommendationResponse;
import com.omstu.agriculturefield.rotation.dto.SeasonalWeatherDto;
import com.omstu.agriculturefield.rotation.dto.SowingWindow;
import com.omstu.agriculturefield.rotation.model.CropRotationRule;
import com.omstu.agriculturefield.rotation.model.enums.RotationRecommendation;
import com.omstu.agriculturefield.rotation.repository.CropRotationRuleRepository;
import com.omstu.agriculturefield.rotation.service.GeocodingService;
import com.omstu.agriculturefield.rotation.service.RotationRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class RotationRecommendationServiceImpl implements RotationRecommendationService {

    private static final String DEFAULT_REGION_CODE = "OMS";
    private static final String DEFAULT_REGION_NAME = "Омская область";
    private static final int CLIMATE_BASELINE_FROM = 2000;
    private static final int CLIMATE_YEARS_LIMIT   = 20;

    private final AgriculturalFieldRepository fieldRepository;
    private final CropHistoryRepository cropHistoryRepository;
    private final CropTypeRepository cropTypeRepository;
    private final CropRotationRuleRepository cropRotationRuleRepository;
    private final GeocodingService geocodingService;
    private final SoilDataRepository soilDataRepository;
    private final CropVarietyRepository cropVarietyRepository;
    private final WeatherCacheService weatherCacheService;
    private final MlCacheService mlCacheService;
    private final SowingDateService sowingDateService;
    private final SoilHorizonRepository soilHorizonRepository;
    private final FertilizerApplicationRepository fertilizerApplicationRepository;
    private final PlantProtectionRepository plantProtectionRepository;
    private final PhenologicalObservationRepository phenologicalObservationRepository;

    @Override
    @Transactional(readOnly = true)
    public CropRecommendationResponse getRecommendations(Long fieldId, Integer targetYear) {
        log.info("Building recommendations for fieldId={}, targetYear={}", fieldId, targetYear);

        AgriculturalField field = fieldRepository.findById(fieldId)
                .orElseThrow(() -> new RuntimeException("Field not found with id: " + fieldId));

        String resolvedRegionName = resolveFieldRegionName(field);
        String resolvedRegionCode = geocodingService.resolveRegionCode(resolvedRegionName);

        List<CropHistory> history = cropHistoryRepository.findByFieldIdOrderByPlantingDateDesc(fieldId);
        boolean hasHistory = !history.isEmpty();

        SeasonalWeatherDto climateMean = weatherCacheService.fetchAveragedWeather(field);

        int currentYear = java.time.Year.now().getValue();
        // weather — для оценки климата в Java (ERA5-среднее заполняет будущие периоды)
        // weatherForMl — только реальные наблюдения; будущие периоды = null,
        //   чтобы ML сам взял нормы из harvest_master.csv (согласовано с RegionForecastPage)
        SeasonalWeatherDto weather;
        SeasonalWeatherDto weatherForMl;
        if (targetYear == currentYear) {
            SeasonalWeatherDto partial = weatherCacheService.fetchCurrentSeasonWeather(field, climateMean);
            weather = partial;          // ERA5 заполняет будущие периоды — для buildClimateFactor
            weatherForMl = weatherCacheService.extractObservedOnly(partial, climateMean);
        } else {
            weather = climateMean;
            weatherForMl = climateMean;
        }

        double lat = field.getGeom().getCentroid().getY();
        double lon = field.getGeom().getCentroid().getX();
        WeatherForecastData forecast = weatherCacheService.fetchForecastWeather(lat, lon);

        SoilData soilData = soilDataRepository.findByFieldId(fieldId).orElse(null);

        // ── Новые аграрные данные ─────────────────────────────────────────
        List<SoilHorizon> soilHorizons = soilHorizonRepository.findByFieldIdOrderByDepthFromCm(fieldId);

        Long lastHistoryId = hasHistory ? history.get(0).getId() : null;

        List<FertilizerApplication> recentFertilizers = lastHistoryId != null
                ? fertilizerApplicationRepository.findByCropHistoryIdOrderByApplicationDateAsc(lastHistoryId)
                : List.of();

        List<PlantProtectionOperation> recentProtectionOps = lastHistoryId != null
                ? plantProtectionRepository.findByCropHistoryIdOrderByOperationDateAsc(lastHistoryId)
                : List.of();

        PhenologicalObservation latestObservation = null;
        if (lastHistoryId != null) {
            List<PhenologicalObservation> obs =
                    phenologicalObservationRepository.findByCropHistoryIdOrderByObservationDateAsc(lastHistoryId);
            latestObservation = obs.isEmpty() ? null : obs.get(obs.size() - 1);
        }
        // ─────────────────────────────────────────────────────────────────

        List<CropType> allCropTypes = cropTypeRepository.findAll();

        // Для текущего года скрываем озимые культуры вне их агрономического окна посева (авг–сен).
        // Для прошлых/будущих лет — показываем все культуры.
        final int currentMonth = java.time.LocalDate.now().getMonthValue();
        final boolean filterWinterCrops = (targetYear == java.time.Year.now().getValue())
                && (currentMonth < 7 || currentMonth > 9);
        if (filterWinterCrops) {
            allCropTypes = allCropTypes.stream()
                    .filter(ct -> {
                        String code = ct.getMlCropCode() != null ? ct.getMlCropCode()
                                : ct.getName().toLowerCase().replace(" ", "_");
                        return !code.startsWith("winter_");
                    })
                    .collect(java.util.stream.Collectors.toList());
        }

        CropType lastCrop = hasHistory ? history.get(0).getCropType() : null;

        // Pre-fetch rotation rules once for all candidates
        List<CropRotationRule> rotationRules = lastCrop != null
                ? cropRotationRuleRepository.findByPredecessorCropId(lastCrop.getId())
                : List.of();

        Map<String, Double> soilMlScores = mlCacheService.fetchSoilBasedRecommendations(fieldId, soilData, weather);

        final PhenologicalObservation finalLatestObservation = latestObservation;

        List<CropRecommendationItem> items = allCropTypes.stream()
                .map(cropType -> {
                    RotationCheckResult rotationCheck = checkRotationViolation(
                            lastCrop, cropType, history, targetYear, rotationRules);
                    RotationViolation violation = rotationCheck.violation();
                    CropRotationRule matchedRule = rotationCheck.matchedRule();

                    String cropCode = cropType.getMlCropCode() != null ? cropType.getMlCropCode()
                            : cropType.getName().toLowerCase().replace(" ", "_");

                    Double predictedYield = mlCacheService.fetchPredictedYield(
                            resolvedRegionCode, cropCode, targetYear, weatherForMl);
                    Double predictedPrice = mlCacheService.fetchPredictedPrice(
                            resolvedRegionName, cropCode, targetYear);

                    Double estimatedProfit = null;
                    if (predictedYield != null && predictedPrice != null) {
                        // predictedYield в ц/га, predictedPrice в руб/т → конверсия: ц/га * 0.1 = т/га
                        estimatedProfit = predictedYield * 0.1 * predictedPrice;
                    }

                    Double soilCompatibilityScore = computeSoilCompatibilityScore(soilData, soilHorizons, cropCode);
                    if (soilCompatibilityScore == null) {
                        soilCompatibilityScore = soilMlScores.get(cropCode);
                    }

                    CropRecommendationItem.FactorScore rotationFactor = buildRotationFactor(
                            violation, lastCrop, cropType, history, targetYear,
                            matchedRule, recentProtectionOps);
                    CropRecommendationItem.FactorScore soilFactor = buildSoilFactor(
                            soilCompatibilityScore, soilData, soilHorizons, recentFertilizers, cropCode);
                    CropRecommendationItem.FactorScore climateFactor = buildClimateFactor(weather, cropType);
                    CropRecommendationItem.FactorScore economicsFactor = buildEconomicsFactor(estimatedProfit);
                    CropRecommendationItem.ScoreBreakdown breakdown = new CropRecommendationItem.ScoreBreakdown(
                            rotationFactor, soilFactor, climateFactor, economicsFactor);
                    int totalScore = computeTotalScore(breakdown);

                    List<CropRecommendationItem.VarietyRecommendation> varieties =
                            recommendVarieties(cropType, weather, soilData, resolvedRegionName);

                    String summary = buildAgronomistSummary(
                            cropType, violation, breakdown, totalScore, weather, soilData, finalLatestObservation);

                    SowingWindow sowingWindow = sowingDateService.computeSowingWindow(
                            cropCode, targetYear, weather, forecast);

                    return new CropRecommendationItem(
                            cropType.getId(), cropType.getName(),
                            violation == null || !violation.hard(),
                            violation != null ? violation.reason() : null,
                            predictedYield, predictedPrice, estimatedProfit, 0,
                            soilCompatibilityScore, totalScore, breakdown, varieties, summary, sowingWindow);
                })
                .collect(Collectors.toList());

        // Deduplicate by crop name: same mlCropCode may exist under multiple CropType rows.
        // Keep the entry with the highest totalScore for each unique name.
        Map<String, CropRecommendationItem> byName = new LinkedHashMap<>();
        for (CropRecommendationItem item : items) {
            byName.merge(item.cropTypeName(), item,
                    (a, b) -> a.totalScore() >= b.totalScore() ? a : b);
        }
        List<CropRecommendationItem> ranked = rankItemsByTotalScore(new ArrayList<>(byName.values()));
        CropRecommendationResponse.RecommendationMetadata metadata = buildMetadata(
                lastCrop, history, soilData, resolvedRegionName, weather,
                !soilHorizons.isEmpty(), !recentFertilizers.isEmpty(), !recentProtectionOps.isEmpty());

        return new CropRecommendationResponse(fieldId, field.getFieldName(), targetYear, ranked, metadata);
    }

    // ==================== ROTATION VIOLATION CHECK ====================

    private record RotationCheckResult(RotationViolation violation, CropRotationRule matchedRule) {}

    private record RotationViolation(String reason, boolean hard) {
        RotationViolation(String reason) { this(reason, true); }
    }

    private RotationCheckResult checkRotationViolation(CropType lastCrop, CropType candidate,
                                                        List<CropHistory> history, Integer targetYear,
                                                        List<CropRotationRule> rules) {
        if (lastCrop == null) return new RotationCheckResult(null, null);

        Optional<CropRotationRule> matchingRule = rules.stream()
                .filter(r -> r.getSuccessorCrop().getId().equals(candidate.getId()))
                .findFirst();

        if (matchingRule.isPresent()) {
            CropRotationRule rule = matchingRule.get();

            // Gradient recommendation check (takes priority over legacy allowed flag)
            if (rule.getRecommendation() != null) {
                if (rule.getRecommendation() == RotationRecommendation.FORBIDDEN) {
                    String reason = rule.getReason() != null ? rule.getReason()
                            : "Запрещено после " + lastCrop.getName()
                            + (rule.getDiseaseRisk() != null ? ": " + rule.getDiseaseRisk() : " — фитосанитарный риск");
                    return new RotationCheckResult(new RotationViolation(reason, true), rule);
                }
                if (rule.getRecommendation() == RotationRecommendation.NOT_RECOMMENDED) {
                    String reason = rule.getReason() != null ? rule.getReason()
                            : "Не рекомендуется после " + lastCrop.getName()
                            + (rule.getRequiredPractices() != null ? ". " + rule.getRequiredPractices() : "");
                    return new RotationCheckResult(new RotationViolation(reason, false), rule);
                }
            } else if (Boolean.FALSE.equals(rule.getAllowed())) {
                String reason = rule.getReason() != null ? rule.getReason()
                        : "Запрещено правилами севооборота после " + lastCrop.getName();
                return new RotationCheckResult(new RotationViolation(reason, true), rule);
            }

            if (rule.getMinGapYears() != null && rule.getMinGapYears() > 0) {
                int lastPlantYear = history.stream()
                        .filter(h -> h.getCropType().getId().equals(lastCrop.getId()))
                        .mapToInt(h -> toLocalDate(h.getPlantingDate()).getYear())
                        .max().orElse(0);
                int gap = targetYear - lastPlantYear - 1;
                if (gap < rule.getMinGapYears()) {
                    return new RotationCheckResult(new RotationViolation(String.format(
                            "Требуется перерыв %d лет после %s (прошло %d). %s",
                            rule.getMinGapYears(), lastCrop.getName(), gap,
                            rule.getReason() != null ? rule.getReason() : ""), true), rule);
                }
            }
            // Even when a non-prohibitive rule matches, still check heuristic repeat to avoid
            // silent mono-culture (e.g. ACCEPTABLE rule + 3 consecutive years of same crop).
            int yearsWithSameCropRule = 0;
            for (CropHistory h : history) {
                if (h.getCropType().getId().equals(candidate.getId())) {
                    if (targetYear - toLocalDate(h.getPlantingDate()).getYear() <= 4) yearsWithSameCropRule++;
                }
            }
            if (yearsWithSameCropRule >= 2) {
                return new RotationCheckResult(
                        new RotationViolation("Культура повторяется более 2 лет подряд — риск накопления болезней", true),
                        rule);
            }
            return new RotationCheckResult(null, rule);
        }

        int yearsWithSameCrop = 0;
        for (CropHistory h : history) {
            if (h.getCropType().getId().equals(candidate.getId())) {
                if (targetYear - toLocalDate(h.getPlantingDate()).getYear() <= 4) yearsWithSameCrop++;
            }
        }
        if (yearsWithSameCrop >= 2) {
            return new RotationCheckResult(
                    new RotationViolation("Культура повторяется более 2 лет подряд — риск накопления болезней", true),
                    null);
        }
        return new RotationCheckResult(null, null);
    }

    // ==================== SCORE BREAKDOWN BUILDERS ====================

    private CropRecommendationItem.FactorScore buildRotationFactor(
            RotationViolation violation, CropType lastCrop, CropType candidate,
            List<CropHistory> history, Integer targetYear,
            CropRotationRule matchedRule, List<PlantProtectionOperation> protectionOps) {

        if (lastCrop == null) {
            return new CropRecommendationItem.FactorScore(80, 0.30, "GOOD",
                    "История посевов отсутствует — ограничений по севообороту нет");
        }
        if (violation != null) {
            if (violation.hard()) {
                return new CropRecommendationItem.FactorScore(10, 0.30, "CRITICAL", violation.reason());
            }
            // Soft violation (NOT_RECOMMENDED)
            String diseaseDetail = matchedRule != null && matchedRule.getDiseaseRisk() != null
                    ? " Риск болезней: " + matchedRule.getDiseaseRisk() + "." : "";
            return new CropRecommendationItem.FactorScore(30, 0.30, "WARNING",
                    violation.reason() + diseaseDetail);
        }

        long sameInLast4 = history.stream()
                .filter(h -> h.getCropType().getId().equals(candidate.getId()))
                .filter(h -> targetYear - toLocalDate(h.getPlantingDate()).getYear() <= 4)
                .count();

        int baseScore;
        String baseNote;
        if (sameInLast4 == 0) {
            baseScore = 100;
            baseNote = "Культура не выращивалась последние 4 года — отличный вариант для ротации";
        } else if (sameInLast4 == 1) {
            baseScore = 70;
            baseNote = "Культура встречалась 1 раз за последние 4 года — допустимо";
        } else {
            baseScore = 40;
            baseNote = "Культура повторяется " + sameInLast4 + " раза за последние 4 года — риск накопления болезней";
        }

        // Apply gradient recommendation modifier
        String gradientNote = "";
        if (matchedRule != null && matchedRule.getRecommendation() != null) {
            switch (matchedRule.getRecommendation()) {
                case STRONGLY_RECOMMENDED -> {
                    baseScore = Math.min(100, baseScore + 10);
                    gradientNote = " Отличный предшественник.";
                    if (matchedRule.getNitrogenBalance() != null)
                        gradientNote += " " + matchedRule.getNitrogenBalance() + ".";
                }
                case RECOMMENDED -> {
                    if (matchedRule.getNitrogenBalance() != null)
                        gradientNote = " " + matchedRule.getNitrogenBalance() + ".";
                }
                case ACCEPTABLE -> {
                    baseScore = Math.max(0, baseScore - 10);
                    gradientNote = matchedRule.getRequiredPractices() != null
                            ? " Корректирующие меры: " + matchedRule.getRequiredPractices() + "." : "";
                }
                default -> {}
            }
        }

        // Disease pressure penalty from recent plant protection history
        long problemFungicideOps = protectionOps.stream()
                .filter(op -> op.getOperationType() == ProtectionOperationType.FUNGICIDE)
                .filter(op -> Boolean.TRUE.equals(op.getFollowUpRequired())
                        || (op.getEfficacyPercent() != null && op.getEfficacyPercent() < 60))
                .count();
        String diseaseNote = "";
        if (problemFungicideOps >= 2) {
            baseScore = Math.max(0, baseScore - 20);
            diseaseNote = String.format(
                    " Устойчивое давление болезней (%d обработок с низкой эффективностью).", problemFungicideOps);
        } else if (problemFungicideOps == 1) {
            baseScore = Math.max(0, baseScore - 10);
            diseaseNote = " Отмечено давление болезней — рекомендуется усиленная фунгицидная защита.";
        }

        String status = baseScore >= 80 ? "EXCELLENT" : baseScore >= 60 ? "GOOD" : baseScore >= 40 ? "WARNING" : "CRITICAL";
        return new CropRecommendationItem.FactorScore(baseScore, 0.30, status,
                baseNote + gradientNote + diseaseNote);
    }

    private CropRecommendationItem.FactorScore buildSoilFactor(
            Double score, SoilData soilData, List<SoilHorizon> horizons,
            List<FertilizerApplication> fertilizers, String cropCode) {

        boolean hasHorizonData = !horizons.isEmpty();
        String dataSource = hasHorizonData ? " (лаб. анализ горизонтов)" : "";

        if (score == null && soilData == null && !hasHorizonData) {
            return new CropRecommendationItem.FactorScore(50, 0.25, "GOOD",
                    "Данные почвы отсутствуют — балл не рассчитан, используется нейтральная оценка");
        }

        int pct = score != null ? (int) (score * 100) : 50;

        // Fertilizer bonus: recent applications improve effective NPK status
        int fertBonus = computeFertilizerBonus(fertilizers);
        pct = Math.min(100, pct + fertBonus);

        String fertNote = "";
        if (fertBonus > 0) {
            long recentCount = fertilizers.stream()
                    .filter(f -> f.getApplicationDate() != null
                            && !f.getApplicationDate().isBefore(LocalDate.now().minusMonths(12)))
                    .count();
            fertNote = String.format(" Применено %d удобрений за сезон (+%d к баллу).", recentCount, fertBonus);
        }

        if (pct >= 85) return new CropRecommendationItem.FactorScore(pct, 0.25, "EXCELLENT",
                String.format("Почва отлично подходит%s (pH=%.1f, N=%s, P=%s, K=%s)%s",
                        dataSource, bestPh(soilData, horizons), bestN(soilData, horizons),
                        bestP(soilData, horizons), bestK(soilData, horizons), fertNote));
        if (pct >= 65) return new CropRecommendationItem.FactorScore(pct, 0.25, "GOOD",
                String.format("Почва подходит с небольшими отклонениями%s (pH=%.1f)%s",
                        dataSource, bestPh(soilData, horizons), fertNote));
        if (pct >= 40) return new CropRecommendationItem.FactorScore(pct, 0.25, "WARNING",
                "Почвенные условия частично не соответствуют требованиям — рекомендуются корректирующие удобрения"
                        + dataSource + fertNote);
        return new CropRecommendationItem.FactorScore(pct, 0.25, "CRITICAL",
                "Почва плохо подходит — требуется существенная агрохимическая коррекция" + dataSource + fertNote);
    }

    private double bestPh(SoilData sd, List<SoilHorizon> hz) {
        return hz.stream().filter(h -> h.getPhLevel() != null).mapToDouble(SoilHorizon::getPhLevel)
                .findFirst().orElseGet(() -> sd != null && sd.getPhLevel() != null ? sd.getPhLevel() : 0.0);
    }

    private Object bestN(SoilData sd, List<SoilHorizon> hz) {
        return hz.stream().filter(h -> h.getNitrogenN() != null).map(SoilHorizon::getNitrogenN)
                .findFirst().orElseGet(() -> sd != null ? sd.getNitrogenN() : null);
    }

    private Object bestP(SoilData sd, List<SoilHorizon> hz) {
        return hz.stream().filter(h -> h.getPhosphorusP() != null).map(SoilHorizon::getPhosphorusP)
                .findFirst().orElseGet(() -> sd != null ? sd.getPhosphorusP() : null);
    }

    private Object bestK(SoilData sd, List<SoilHorizon> hz) {
        return hz.stream().filter(h -> h.getPotassiumK() != null).map(SoilHorizon::getPotassiumK)
                .findFirst().orElseGet(() -> sd != null ? sd.getPotassiumK() : null);
    }

    private int computeFertilizerBonus(List<FertilizerApplication> fertilizers) {
        LocalDate oneYearAgo = LocalDate.now().minusMonths(12);
        long recentCount = fertilizers.stream()
                .filter(f -> f.getApplicationDate() != null && !f.getApplicationDate().isBefore(oneYearAgo))
                .count();
        if (recentCount >= 3) return 15;
        if (recentCount >= 1) return 8;
        return 0;
    }

    private CropRecommendationItem.FactorScore buildClimateFactor(SeasonalWeatherDto weather, CropType cropType) {
        if (weather == null) {
            return new CropRecommendationItem.FactorScore(50, 0.25, "GOOD",
                    "Данные о погоде недоступны — оценка климата не выполнена");
        }
        int currentYear = java.time.Year.now().getValue();
        int fromYear = Math.max(CLIMATE_BASELINE_FROM, currentYear - CLIMATE_YEARS_LIMIT);
        boolean isCurrentSeason = weather.year() != null && weather.year() == currentYear;
        String climateNote = isCurrentSeason
                ? String.format("Факт %d + ERA5-норма %d–%d. ", currentYear, fromYear, currentYear - 1)
                : String.format("Среднее ERA5 %d–%d. ", fromYear, currentYear - 1);

        double waterNeed = cropType.getWaterRequirementsMm() != null
                ? cropType.getWaterRequirementsMm().doubleValue() : 300;
        boolean isWinter = cropType.getMlCropCode() != null
                ? cropType.getMlCropCode().startsWith("winter_")
                : (cropType.getName() != null && cropType.getName().toLowerCase().contains("озим"));
        double totalPrecip = (weather.precipAprMay() != null ? weather.precipAprMay() : 0)
                + (weather.precipJunJul() != null ? weather.precipJunJul() : 0)
                + (weather.precipAugSep() != null ? weather.precipAugSep() : 0)
                + (isWinter && weather.precipOctMar() != null ? weather.precipOctMar() : 0);
        Double gtk = weather.gtkJunJul();
        Integer heatDays = weather.totalHeatStressDays();

        int score = 100;
        StringBuilder explanation = new StringBuilder(climateNote);

        if (totalPrecip < waterNeed * 0.7) {
            score -= 30;
            explanation.append(String.format(
                    "Осадки вегетации (%.0f мм) значительно ниже потребности (%.0f мм). ", totalPrecip, waterNeed));
        } else if (totalPrecip < waterNeed * 0.9) {
            score -= 10;
            explanation.append(String.format("Осадки вегетации (%.0f мм) немного ниже нормы. ", totalPrecip));
        } else {
            explanation.append(String.format("Увлажнение вегетации в норме (%.0f мм). ", totalPrecip));
        }
        if (gtk != null && gtk < 0.8) {
            score -= 25;
            explanation.append(String.format("ГТК июнь-июль=%.2f — засушливые условия (ГТК < 0.8). ", gtk));
        } else if (gtk != null && gtk >= 1.0) {
            explanation.append(String.format("ГТК июнь-июль=%.2f — достаточное увлажнение. ", gtk));
        }
        if (heatDays != null && heatDays > 15) {
            score -= 20;
            explanation.append(String.format("В среднем %d дней/год с T>30C — высокий жаровой стресс. ", heatDays));
        } else if (heatDays != null && heatDays > 7) {
            score -= 10;
            explanation.append(String.format("В среднем %d дней/год с T>30C — умеренный стресс. ", heatDays));
        }

        score = Math.max(0, Math.min(100, score));
        String status = score >= 80 ? "EXCELLENT" : score >= 60 ? "GOOD" : score >= 40 ? "WARNING" : "CRITICAL";
        return new CropRecommendationItem.FactorScore(score, 0.25, status, explanation.toString().trim());
    }

    private CropRecommendationItem.FactorScore buildEconomicsFactor(Double estimatedProfit) {
        if (estimatedProfit == null) return new CropRecommendationItem.FactorScore(50, 0.20, "GOOD",
                "Нет данных о прогнозе цены или урожайности — экономическая оценка не выполнена");
        if (estimatedProfit > 30000) return new CropRecommendationItem.FactorScore(100, 0.20, "EXCELLENT",
                String.format("Прогнозируемая прибыль %.0f руб/га — высокая доходность", estimatedProfit));
        if (estimatedProfit > 15000) return new CropRecommendationItem.FactorScore(80, 0.20, "GOOD",
                String.format("Прогнозируемая прибыль %.0f руб/га — хорошая доходность", estimatedProfit));
        if (estimatedProfit > 0) return new CropRecommendationItem.FactorScore(55, 0.20, "WARNING",
                String.format("Прогнозируемая прибыль %.0f руб/га — невысокая доходность", estimatedProfit));
        return new CropRecommendationItem.FactorScore(20, 0.20, "CRITICAL",
                String.format("Прогнозируемая прибыль %.0f руб/га — убыточно", estimatedProfit));
    }

    private int computeTotalScore(CropRecommendationItem.ScoreBreakdown b) {
        return (int) (b.rotation().score() * b.rotation().weight()
                + b.soil().score() * b.soil().weight()
                + b.climate().score() * b.climate().weight()
                + b.economics().score() * b.economics().weight());
    }

    // ==================== SOIL COMPATIBILITY ====================

    private static final Map<String, double[]> CROP_SOIL_REQUIREMENTS = Map.ofEntries(
            // format: [pH_min, pH_max, N_min, N_max, P_min, P_max, K_min, K_max]
            Map.entry("spring_wheat",  new double[]{5.5, 7.5,  60, 200,  20,  80,  60, 200}),
            Map.entry("winter_wheat",  new double[]{5.5, 7.5,  70, 220,  25,  90,  70, 220}),
            Map.entry("spring_barley", new double[]{5.5, 7.5,  50, 180,  15,  70,  50, 180}),
            Map.entry("winter_barley", new double[]{5.5, 7.5,  50, 180,  15,  70,  50, 180}),
            Map.entry("corn",          new double[]{5.8, 7.0,  80, 250,  30, 100,  80, 250}),
            Map.entry("sunflower",     new double[]{6.0, 7.5,  40, 150,  20,  80,  80, 280}),
            Map.entry("soybean",       new double[]{6.0, 7.0,  20, 100,  25,  90,  60, 200}),
            Map.entry("rapeseed",      new double[]{5.8, 7.2,  60, 200,  30,  90,  60, 200}),
            Map.entry("peas",          new double[]{6.0, 7.5,  20,  80,  20,  80,  60, 200}),
            Map.entry("buckwheat",     new double[]{4.5, 7.5,  30, 120,  15,  60,  40, 150}),
            Map.entry("flax",          new double[]{5.5, 7.0,  40, 150,  15,  60,  50, 180}),
            Map.entry("oat",           new double[]{5.0, 7.5,  40, 160,  15,  60,  50, 180}),
            Map.entry("rye",           new double[]{4.5, 7.5,  40, 150,  15,  60,  40, 160}),
            Map.entry("millet",        new double[]{5.5, 7.5,  40, 150,  15,  60,  60, 200})
    );

    private Double computeSoilCompatibilityScore(SoilData soil, List<SoilHorizon> horizons, String cropCode) {
        double[] req = CROP_SOIL_REQUIREMENTS.get(cropCode);
        if (req == null) return null;

        SoilHorizon topHorizon = horizons.stream()
                .filter(h -> h.getDepthFromCm() <= 5)
                .findFirst().orElse(null);

        Double ph = topHorizon != null && topHorizon.getPhLevel() != null ? topHorizon.getPhLevel()
                : (soil != null ? soil.getPhLevel() : null);
        Double n  = topHorizon != null && topHorizon.getNitrogenN() != null ? topHorizon.getNitrogenN()
                : (soil != null ? soil.getNitrogenN() : null);
        Double p  = topHorizon != null && topHorizon.getPhosphorusP() != null ? topHorizon.getPhosphorusP()
                : (soil != null ? soil.getPhosphorusP() : null);
        Double k  = topHorizon != null && topHorizon.getPotassiumK() != null ? topHorizon.getPotassiumK()
                : (soil != null ? soil.getPotassiumK() : null);

        double total = 0.0;
        int factors = 0;
        if (ph != null) { total += rangeScore(ph, req[0], req[1]); factors++; }
        if (n  != null) { total += rangeScore(n,  req[2], req[3]); factors++; }
        if (p  != null) { total += rangeScore(p,  req[4], req[5]); factors++; }
        if (k  != null) { total += rangeScore(k,  req[6], req[7]); factors++; }
        return factors == 0 ? null : total / factors;
    }

    private double rangeScore(double value, double min, double max) {
        if (value >= min && value <= max) return 1.0;
        double width = max - min;
        double decay = Math.max(width * 0.5, 0.01);
        if (value < min) return Math.max(0.0, 1.0 - (min - value) / decay);
        return Math.max(0.0, 1.0 - (value - max) / decay);
    }

    private List<CropRecommendationItem> rankItemsByTotalScore(List<CropRecommendationItem> items) {
        List<CropRecommendationItem> sorted = items.stream()
                .sorted(Comparator
                        .comparing(CropRecommendationItem::rotationCompliant).reversed()
                        .thenComparingInt(i -> -i.totalScore()))
                .toList();
        List<CropRecommendationItem> ranked = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            CropRecommendationItem item = sorted.get(i);
            ranked.add(new CropRecommendationItem(
                    item.cropTypeId(), item.cropTypeName(),
                    item.rotationCompliant(), item.rotationViolationReason(),
                    item.predictedYieldCentnersPerHa(), item.predictedPriceRubPerTon(),
                    item.estimatedProfitRubPerHa(), i + 1,
                    item.soilCompatibilityScore(), item.totalScore(),
                    item.scoreBreakdown(), item.recommendedVarieties(), item.agronomistSummary(),
                    item.sowingWindow()
            ));
        }
        return ranked;
    }

    // ==================== VARIETY RECOMMENDATION ====================

    private List<CropRecommendationItem.VarietyRecommendation> recommendVarieties(
            CropType cropType, SeasonalWeatherDto weather, SoilData soilData, String regionName) {

        boolean droughtRisk = weather != null && weather.gtkJunJul() != null && weather.gtkJunJul() < 0.8;
        boolean frostRisk   = weather != null && Boolean.TRUE.equals(weather.frostRiskSpring());
        boolean heatRisk    = weather != null && weather.totalHeatStressDays() != null && weather.totalHeatStressDays() > 10;
        boolean westernSib  = regionName != null && (regionName.contains("Омск") || regionName.contains("Новосибирск")
                || regionName.contains("Алтай") || regionName.contains("Тюмень") || regionName.contains("Курган"));

        return cropVarietyRepository.findByCropTypeId(cropType.getId()).stream()
                .filter(v -> isVarietySuitable(v, droughtRisk, frostRisk, westernSib))
                .sorted(Comparator
                        .comparing((CropVariety v) -> !Boolean.TRUE.equals(v.getIsTopByArea()))
                        .thenComparing(v -> !"РФ".equals(v.getOrigin())))
                .limit(3)
                .map(v -> new CropRecommendationItem.VarietyRecommendation(
                        v.getName(),
                        v.getSeedProducer() != null ? v.getSeedProducer() : "",
                        v.getOrigin() != null ? v.getOrigin() : "РФ",
                        v.getDroughtTolerance() != null ? v.getDroughtTolerance().name() : "СРЕДНЯЯ",
                        v.getFrostTolerance() != null ? v.getFrostTolerance().name() : "СРЕДНЯЯ",
                        v.getMaturationDays() != null ? v.getMaturationDays() : 90,
                        v.getRecommendedRegions() != null ? v.getRecommendedRegions() : "",
                        buildVarietyReason(v, droughtRisk, frostRisk, heatRisk, regionName),
                        Boolean.TRUE.equals(v.getIsTopByArea())
                ))
                .collect(Collectors.toList());
    }

    private boolean isVarietySuitable(CropVariety v, boolean droughtRisk, boolean frostRisk, boolean westernSib) {
        if (droughtRisk && ToleranceLevel.LOW == v.getDroughtTolerance()) return false;
        if (frostRisk   && ToleranceLevel.LOW == v.getFrostTolerance()) return false;
        if (westernSib && v.getRecommendedRegions() != null && !v.getRecommendedRegions().isEmpty()
                && !v.getRecommendedRegions().contains("Западно-Сибирский")
                && !v.getRecommendedRegions().contains("Уральский")) return false;
        return true;
    }

    private String buildVarietyReason(CropVariety v, boolean droughtRisk, boolean frostRisk,
                                       boolean heatRisk, String regionName) {
        List<String> reasons = new ArrayList<>();
        if (Boolean.TRUE.equals(v.getIsTopByArea()))
            reasons.add("входит в топ по объёму высева в РФ (Россельхозцентр 2023)");
        if (droughtRisk && (ToleranceLevel.HIGH == v.getDroughtTolerance() || ToleranceLevel.VERY_HIGH == v.getDroughtTolerance()))
            reasons.add("высокая засухоустойчивость — важно для данного региона");
        if (frostRisk && (ToleranceLevel.HIGH == v.getFrostTolerance() || ToleranceLevel.VERY_HIGH == v.getFrostTolerance()))
            reasons.add("высокая морозостойкость — важно при весенних заморозках");
        if (v.getRecommendedRegions() != null
                && (v.getRecommendedRegions().contains("Западно-Сибирский") || v.getRecommendedRegions().contains("Уральский")))
            reasons.add("допущен в Западно-Сибирском регионе (ГосРеестр РФ)");
        if (v.getNotes() != null && !v.getNotes().isBlank()) reasons.add(v.getNotes());
        return reasons.isEmpty() ? "Проверенный сорт" : String.join("; ", reasons);
    }

    // ==================== SUMMARY & METADATA ====================

    private String buildAgronomistSummary(CropType cropType, RotationViolation violation,
                                           CropRecommendationItem.ScoreBreakdown b, int totalScore,
                                           SeasonalWeatherDto weather, SoilData soilData,
                                           PhenologicalObservation latestObservation) {
        StringBuilder sb = new StringBuilder();
        if (totalScore >= 80) sb.append("OK ");
        else if (totalScore >= 60) sb.append("WARN ");
        else if (totalScore >= 40) sb.append("WARN ");
        else sb.append("ERR ");

        sb.append(cropType.getName()).append(" — балл: ").append(totalScore).append("/100. ");

        if (violation != null) {
            sb.append(violation.hard() ? "Нарушение севооборота: " : "Предупреждение: ")
              .append(violation.reason()).append(" ");
        } else {
            sb.append("Севооборот соблюдён. ");
        }
        if ("CRITICAL".equals(b.climate().status()) || "WARNING".equals(b.climate().status()))
            sb.append(b.climate().explanation()).append(" ");
        if (soilData != null && b.soil().score() < 60)
            sb.append(b.soil().explanation()).append(" ");
        if (b.economics().score() >= 80)
            sb.append(b.economics().explanation());

        if (latestObservation != null) {
            sb.append(String.format(" Текущая фаза BBCH %d", latestObservation.getBbchScale()));
            if (latestObservation.getBbchDescription() != null && !latestObservation.getBbchDescription().isBlank())
                sb.append(" (").append(latestObservation.getBbchDescription()).append(")");
            sb.append(" — наблюдение от ").append(latestObservation.getObservationDate()).append(".");
        }
        return sb.toString().trim();
    }

    private CropRecommendationResponse.RecommendationMetadata buildMetadata(
            CropType lastCrop, List<CropHistory> history, SoilData soilData,
            String regionName, SeasonalWeatherDto weather,
            boolean hasHorizons, boolean hasFertilizers, boolean hasProtectionOps) {
        int currentYear = java.time.Year.now().getValue();
        int fromYear = Math.max(CLIMATE_BASELINE_FROM, currentYear - CLIMATE_YEARS_LIMIT);
        String weatherNote = String.format(
                "ERA5 (archive-api.open-meteo.com), многолетнее среднее %d–%d гг. (%d лет)",
                fromYear, currentYear - 1, currentYear - 1 - fromYear + 1);

        List<String> sources = new ArrayList<>(List.of(
                "ML-прогноз урожайности (LightGBM, CV R2=0.93)",
                "цены (LightGBM, CV R2=0.94)", "агрометрики ERA5"));
        if (hasHorizons) sources.add("лабораторный анализ горизонтов почвы");
        else sources.add("агрохимия SoilGrids");
        if (hasFertilizers) sources.add("журнал удобрений");
        if (hasProtectionOps) sources.add("журнал защиты растений");
        sources.add("правила севооборота ГОСТ + градиентные рекомендации");

        return new CropRecommendationResponse.RecommendationMetadata(
                lastCrop != null ? lastCrop.getName() : "нет данных",
                history.size(),
                soilData != null ? soilData.getSoilTexture() : null,
                soilData != null ? soilData.getPhLevel() : null,
                regionName, weatherNote,
                "Севооборот 30% · Почва 25% · Климат 25% · Экономика 20%. Источники: "
                        + String.join(", ", sources) + "."
        );
    }

    private LocalDate toLocalDate(Date date) {
        if (date == null) return LocalDate.now();
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
    }

    private String resolveFieldRegionName(AgriculturalField field) {
        if (field.getRegionName() != null && !field.getRegionName().isBlank()) return field.getRegionName();
        try {
            double lat = field.getGeom().getCentroid().getY();
            double lon = field.getGeom().getCentroid().getX();
            String resolved = geocodingService.resolveRegionName(lat, lon);
            if (resolved != null) {
                log.info("Resolved region '{}' for field {} at ({}, {})", resolved, field.getId(), lat, lon);
                return resolved;
            }
        } catch (Exception e) {
            log.warn("Failed to resolve region from coordinates for field {}: {}", field.getId(), e.getMessage());
        }
        return DEFAULT_REGION_NAME;
    }
}
