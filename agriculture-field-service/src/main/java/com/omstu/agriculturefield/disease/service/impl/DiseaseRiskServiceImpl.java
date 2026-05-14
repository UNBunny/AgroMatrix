package com.omstu.agriculturefield.disease.service.impl;

import com.omstu.agriculturefield.disease.dto.DiseaseRiskItem;
import com.omstu.agriculturefield.disease.dto.DiseaseRiskResponse;
import com.omstu.agriculturefield.disease.dto.WeatherForecastData;
import com.omstu.agriculturefield.disease.model.DiseaseRiskRule;
import com.omstu.agriculturefield.disease.model.enums.RiskLevel;
import com.omstu.agriculturefield.disease.repository.DiseaseRiskRuleRepository;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// Оценивает риски засухи, заморозков, теплового стресса и болезней для поля.
// Тянет прогноз/историю из Weather Service, при недоступности — возвращает fallback.
@Service
@Slf4j
@RequiredArgsConstructor
public class DiseaseRiskServiceImpl implements com.omstu.agriculturefield.disease.service.DiseaseRiskService {

    private final WeatherServiceClient weatherServiceClient;
    private final DiseaseRiskRuleRepository riskRuleRepository;
    private final AgriculturalFieldRepository fieldRepository;

    @Transactional(readOnly = true)
    public Mono<DiseaseRiskResponse> assessFieldRisk(Long fieldId, String cropName) {
        log.info("Оценка рисков для поля {} с культурой '{}'", fieldId, cropName);

        AgriculturalField field = fieldRepository.findById(fieldId)
                .orElseThrow(() -> new RuntimeException("Поле не найдено с id: " + fieldId));

        // Получаем центроид поля для координат
        Point centroid = field.getGeom().getCentroid();
        double lat = centroid.getY();
        double lon = centroid.getX();

        log.info("Координаты поля {}: lat={}, lon={}", fieldId, lat, lon);

        // Запрашиваем прогноз на 14 дней
        return weatherServiceClient.getForecastMetrics(lat, lon, 14)
                .map(weatherData -> buildRiskResponse(field, cropName, weatherData, "FORECAST"))
                .switchIfEmpty(Mono.defer(() -> {
                    log.warn("Прогноз недоступен для поля {}, пробуем исторические данные", fieldId);
                    return getHistoricalFallback(field, cropName, lat, lon);
                }))
                .switchIfEmpty(Mono.defer(() -> {
                    log.warn("Все источники данных недоступны, возвращаем оценку без погоды");
                    return Mono.just(buildFallbackResponse(field, cropName));
                }));
    }

    // fallback: прогноз недоступен — берём те же даты прошлого года
    private Mono<DiseaseRiskResponse> getHistoricalFallback(
            AgriculturalField field, String cropName, double lat, double lon) {

        java.time.LocalDate now = java.time.LocalDate.now();
        java.time.LocalDate startDate = now.minusYears(1);
        java.time.LocalDate endDate = startDate.plusDays(14);

        return weatherServiceClient.getHistoricalMetrics(lat, lon, startDate.toString(), endDate.toString())
                .map(weatherData -> buildRiskResponse(field, cropName, weatherData, "HISTORICAL"));
    }

    private DiseaseRiskResponse buildRiskResponse(
            AgriculturalField field,
            String cropName,
            WeatherForecastData weather,
            String dataSource) {

        log.info("Построение оценки рисков: поле={}, культура={}, источник={}",
                field.getId(), cropName, dataSource);

        // 1. Оцениваем общие абиотические риски
        RiskLevel droughtRisk = assessDroughtRisk(weather);
        Double droughtScore = riskLevelToScore(droughtRisk);
        String droughtDesc = describeDroughtRisk(weather, droughtRisk);

        RiskLevel frostRisk = assessFrostRisk(weather);
        Double frostScore = riskLevelToScore(frostRisk);
        String frostDesc = describeFrostRisk(weather, frostRisk);

        RiskLevel heatRisk = assessHeatStressRisk(weather);
        Double heatScore = riskLevelToScore(heatRisk);
        String heatDesc = describeHeatStressRisk(weather, heatRisk);

        // 2. Оцениваем риски болезней (rule-based)
        List<DiseaseRiskItem> diseaseRisks = assessDiseaseRisks(cropName, weather);

        // 3. Общий уровень риска — максимум из всех
        double maxDiseaseScore = diseaseRisks.stream()
                .mapToDouble(DiseaseRiskItem::riskScore)
                .max()
                .orElse(0.0);

        double overallScore = Math.max(
                Math.max(droughtScore, Math.max(frostScore, heatScore)),
                maxDiseaseScore
        );
        RiskLevel overallRisk = scoreToRiskLevel(overallScore);

        // 4. Генерируем рекомендации
        List<String> recommendations = generateRecommendations(
                droughtRisk, frostRisk, heatRisk, diseaseRisks, weather);

        return new DiseaseRiskResponse(
                field.getId(),
                field.getFieldName(),
                cropName,
                overallRisk,
                Math.round(overallScore * 100.0) / 100.0,
                weather.avgTemp(),
                weather.sumPrecipitation(),
                weather.avgHumidity(),
                weather.heatStressDays(),
                weather.longestDryPeriod(),
                weather.gtk(),

                droughtRisk, droughtScore, droughtDesc,
                frostRisk, frostScore, frostDesc,
                heatRisk, heatScore, heatDesc,
                diseaseRisks,
                recommendations,
                LocalDateTime.now(),
                dataSource
        );
    }

    // все источники погоды недоступны — возвращаем MEDIUM с предупреждением
    private DiseaseRiskResponse buildFallbackResponse(AgriculturalField field, String cropName) {
        int currentMonth = LocalDateTime.now().getMonthValue();
        String seasonWarning = getSeasonWarning(currentMonth);

        List<String> recommendations = new ArrayList<>();
        recommendations.add("⚠️ Погодные данные временно недоступны. Оценка рисков приблизительная.");
        if (seasonWarning != null) {
            recommendations.add(seasonWarning);
        }
        recommendations.add("Рекомендуется повторить оценку позже, когда данные погоды станут доступны.");

        return new DiseaseRiskResponse(
                field.getId(),
                field.getFieldName(),
                cropName,
                RiskLevel.MEDIUM,
                0.5,
                null, null, null, null, null, null,
                RiskLevel.MEDIUM, 0.5, "Данные недоступны — невозможно оценить",
                RiskLevel.MEDIUM, 0.5, "Данные недоступны — невозможно оценить",
                RiskLevel.MEDIUM, 0.5, "Данные недоступны — невозможно оценить",
                List.of(),
                recommendations,
                LocalDateTime.now(),
                "FALLBACK"
        );
    }

    // ===== Оценки абиотических рисков =====

    // ГТК < 0.4 = CRITICAL, 0.4-0.7 = HIGH, 0.7-1.0 = MEDIUM, >1.0 = LOW
    // зимой ГТК=0 это норма — не считаем засухой
    private RiskLevel assessDroughtRisk(WeatherForecastData weather) {
        Double gtk = weather.gtk();
        Integer dryPeriod = weather.longestDryPeriod();

        if (gtk == null && dryPeriod == null) return RiskLevel.LOW;

        // Проверяем сезон - зимой засуха не актуальна
        boolean isWinter = isWinter();

        if (isWinter) {
            // Зимой ГТК=0 это норма, риск засухи LOW
            return RiskLevel.LOW;
        }

        // ГТК — основной индикатор (только в вегетационный период)
        if (gtk != null) {
            if (gtk < 0.4) return RiskLevel.CRITICAL;
            if (gtk < 0.7) return RiskLevel.HIGH;
            if (gtk < 1.0) return RiskLevel.MEDIUM;
        }

        // Длительный сухой период — дополнительный фактор
        if (dryPeriod != null) {
            if (dryPeriod >= 14) return RiskLevel.HIGH;  // Зимой снижаем критичность
            if (dryPeriod >= 10) return RiskLevel.MEDIUM;
            if (dryPeriod >= 7) return RiskLevel.LOW;
        }

        return RiskLevel.LOW;
    }

    // пороги разные по сезонам: зимой норма -25°C, весной/осенью уже -2°C критично, летом 0°C = CRITICAL
    private RiskLevel assessFrostRisk(WeatherForecastData weather) {
        Double minTemp = weather.minTempRecord();
        if (minTemp == null) return RiskLevel.LOW;

        Month currentMonth = LocalDateTime.now().getMonth();
        boolean isWinter = isWinter();
        boolean isSpringOrFall = currentMonth == Month.MARCH ||
                                currentMonth == Month.APRIL ||
                                currentMonth == Month.SEPTEMBER ||
                                currentMonth == Month.OCTOBER ||
                                currentMonth == Month.NOVEMBER;

        if (isWinter) {
            // Зимой критично только экстремальные морозы ниже -30°C (могут погубить даже озимые)
            if (minTemp <= -30.0) return RiskLevel.CRITICAL;
            if (minTemp <= -25.0) return RiskLevel.HIGH;
            if (minTemp <= -20.0) return RiskLevel.MEDIUM;
            return RiskLevel.LOW; // Морозы зимой - норма
        } else if (isSpringOrFall) {
            // Весной и осенью заморозки опасны для всходов/цветения
            if (minTemp <= -5.0) return RiskLevel.CRITICAL;
            if (minTemp <= -2.0) return RiskLevel.HIGH;
            if (minTemp <= 0.0) return RiskLevel.MEDIUM;
            if (minTemp <= 3.0) return RiskLevel.LOW;
        } else {
            // Летом любые заморозки очень опасны
            if (minTemp <= 0.0) return RiskLevel.CRITICAL;
            if (minTemp <= 3.0) return RiskLevel.HIGH;
            if (minTemp <= 5.0) return RiskLevel.MEDIUM;
        }

        return RiskLevel.LOW;
    }

    private RiskLevel assessHeatStressRisk(WeatherForecastData weather) {
        Integer heatDays = weather.heatStressDays();
        Integer extremeDays = weather.extremeHeatDays();

        if (extremeDays != null && extremeDays >= 3) return RiskLevel.CRITICAL;
        if (heatDays != null && heatDays >= 7) return RiskLevel.CRITICAL;
        if (heatDays != null && heatDays >= 5) return RiskLevel.HIGH;
        if (extremeDays != null && extremeDays >= 1) return RiskLevel.HIGH;
        if (heatDays != null && heatDays >= 3) return RiskLevel.MEDIUM;

        return RiskLevel.LOW;
    }

    // ===== Оценка рисков болезней (rule-based) =====

    // для каждого активного правила из БД проверяем условия по погоде
    private List<DiseaseRiskItem> assessDiseaseRisks(String cropName, WeatherForecastData weather) {
        List<DiseaseRiskRule> rules = riskRuleRepository.findActiveRulesByCrop(cropName);
        log.info("Найдено {} правил для культуры '{}'", rules.size(), cropName);

        List<DiseaseRiskItem> risks = new ArrayList<>();

        for (DiseaseRiskRule rule : rules) {
            List<String> triggeredConditions = evaluateRule(rule, weather);

            if (!triggeredConditions.isEmpty()) {
                log.info("Правило '{}' сработало ({} условий): {}",
                        rule.getDiseaseName(), triggeredConditions.size(), triggeredConditions);

                // Вес риска зависит от количества сработавших условий
                int totalConditions = countTotalConditions(rule);
                double matchRatio = (double) triggeredConditions.size() / totalConditions;
                double adjustedScore = rule.getRiskWeight() * matchRatio;

                RiskLevel adjustedLevel = adjustRiskByMatchRatio(rule.getRiskLevel(), matchRatio);

                risks.add(new DiseaseRiskItem(
                        rule.getId(),
                        rule.getDiseaseName(),
                        rule.getDiseaseType() != null ? rule.getDiseaseType().name() : "UNKNOWN",
                        adjustedLevel,
                        Math.round(adjustedScore * 100.0) / 100.0,
                        rule.getRuleDescription(),
                        triggeredConditions,
                        rule.getPreventionAdvice(),
                        rule.getTreatmentAdvice(),
                        rule.getUrgencyDays()
                ));
            }
        }

        // Сортируем по уровню риска (от критического к низкому)
        risks.sort(Comparator.comparingDouble(DiseaseRiskItem::riskScore).reversed());

        return risks;
    }

    // возвращает список сработавших условий, пустой список = правило не применяется
    private List<String> evaluateRule(DiseaseRiskRule rule, WeatherForecastData weather) {
        List<String> triggered = new ArrayList<>();

        // Проверка сезона
        if (rule.getActiveSeason() != null && !rule.getActiveSeason().isEmpty()) {
            int currentMonth = LocalDateTime.now().getMonthValue();
            String[] months = rule.getActiveSeason().split(",");
            boolean inSeason = false;
            for (String m : months) {
                if (Integer.parseInt(m.trim()) == currentMonth) {
                    inSeason = true;
                    break;
                }
            }
            if (!inSeason) {
                return List.of(); // Не сезон — правило не применяется
            }
        }

        // Температурные условия
        if (rule.getTempMinThreshold() != null && weather.avgTemp() != null) {
            if (weather.avgTemp() >= rule.getTempMinThreshold()) {
                triggered.add(String.format("Средняя температура %.1f°C ≥ порог %.1f°C",
                        weather.avgTemp(), rule.getTempMinThreshold()));
            }
        }

        if (rule.getTempMaxThreshold() != null && weather.avgTemp() != null) {
            if (weather.avgTemp() <= rule.getTempMaxThreshold()) {
                triggered.add(String.format("Средняя температура %.1f°C ≤ порог %.1f°C",
                        weather.avgTemp(), rule.getTempMaxThreshold()));
            }
        }

        // Осадки
        if (rule.getPrecipMin7d() != null && weather.sumPrecipitation() != null) {
            if (weather.sumPrecipitation() >= rule.getPrecipMin7d()) {
                triggered.add(String.format("Осадки %.1f мм ≥ порог %.1f мм",
                        weather.sumPrecipitation(), rule.getPrecipMin7d()));
            }
        }

        if (rule.getPrecipMax7d() != null && weather.sumPrecipitation() != null) {
            if (weather.sumPrecipitation() <= rule.getPrecipMax7d()) {
                triggered.add(String.format("Осадки %.1f мм ≤ порог %.1f мм (сухо)",
                        weather.sumPrecipitation(), rule.getPrecipMax7d()));
            }
        }

        // ГТК
        if (rule.getGtkMin() != null && weather.gtk() != null) {
            if (weather.gtk() >= rule.getGtkMin()) {
                triggered.add(String.format("ГТК %.2f ≥ порог %.2f (высокая влажность)",
                        weather.gtk(), rule.getGtkMin()));
            }
        }

        if (rule.getGtkMax() != null && weather.gtk() != null) {
            if (weather.gtk() <= rule.getGtkMax()) {
                triggered.add(String.format("ГТК %.2f ≤ порог %.2f (сухо)",
                        weather.gtk(), rule.getGtkMax()));
            }
        }

        // Тепловой стресс
        if (rule.getHeatStressDaysMin() != null && weather.heatStressDays() != null) {
            if (weather.heatStressDays() >= rule.getHeatStressDaysMin()) {
                triggered.add(String.format("Дней теплового стресса %d ≥ порог %d",
                        weather.heatStressDays(), rule.getHeatStressDaysMin()));
            }
        }

        // Длительный сухой период
        if (rule.getDryPeriodDaysMin() != null && weather.longestDryPeriod() != null) {
            if (weather.longestDryPeriod() >= rule.getDryPeriodDaysMin()) {
                triggered.add(String.format("Сухой период %d дней ≥ порог %d дней",
                        weather.longestDryPeriod(), rule.getDryPeriodDaysMin()));
            }
        }

        // Влажность воздуха
        if (rule.getHumidityMinThreshold() != null && weather.avgHumidity() != null) {
            if (weather.avgHumidity() >= rule.getHumidityMinThreshold()) {
                triggered.add(String.format("Влажность воздуха %.0f%% ≥ порог %.0f%%",
                        weather.avgHumidity(), rule.getHumidityMinThreshold()));
            }
        }

        return triggered;
    }

    private int countTotalConditions(DiseaseRiskRule rule) {
        int count = 0;
        if (rule.getTempMinThreshold() != null) count++;
        if (rule.getTempMaxThreshold() != null) count++;
        if (rule.getPrecipMin7d() != null) count++;
        if (rule.getPrecipMax7d() != null) count++;
        if (rule.getHumidityMinThreshold() != null) count++;
        if (rule.getGtkMin() != null) count++;
        if (rule.getGtkMax() != null) count++;
        if (rule.getHeatStressDaysMin() != null) count++;
        if (rule.getDryPeriodDaysMin() != null) count++;
        return Math.max(count, 1); // Защита от деления на 0
    }

    // >= 80% условий = базовый уровень, 50-80% = минус один уровень, < 50% = минус два
    private RiskLevel adjustRiskByMatchRatio(RiskLevel baseLevel, double matchRatio) {
        if (matchRatio >= 0.8) return baseLevel; // Всё совпало - базовый уровень
        if (matchRatio >= 0.5) {
            // Понижаем на один уровень
            return switch (baseLevel) {
                case CRITICAL -> RiskLevel.HIGH;
                case HIGH -> RiskLevel.MEDIUM;
                default -> RiskLevel.LOW;
            };
        }
        // Менее 50% условий — понижаем на два уровня
        return switch (baseLevel) {
            case CRITICAL -> RiskLevel.MEDIUM;
            case HIGH -> RiskLevel.LOW;
            default -> RiskLevel.LOW;
        };
    }

    // ===== Описания рисков =====

    private String describeDroughtRisk(WeatherForecastData weather, RiskLevel level) {
        boolean isWinter = isWinter();

        if (isWinter) {
            return "Зимний период — растения в покое, риск засухи не актуален";
        }

        if (level == RiskLevel.LOW) return "Увлажнение достаточное, риск засухи низкий";

        StringBuilder sb = new StringBuilder();
        if (weather.gtk() != null) {
            sb.append(String.format("ГТК = %.2f", weather.gtk()));
            if (weather.gtk() < 0.4) sb.append(" (сильная засуха)");
            else if (weather.gtk() < 0.7) sb.append(" (засушливо)");
            else sb.append(" (недостаточное увлажнение)");
        }
        if (weather.longestDryPeriod() != null && weather.longestDryPeriod() >= 7) {
            if (!sb.isEmpty()) sb.append(". ");
            sb.append(String.format("Сухой период: %d дней подряд без осадков", weather.longestDryPeriod()));
        }
        return sb.toString();
    }

    private String describeFrostRisk(WeatherForecastData weather, RiskLevel level) {
        boolean isWinter = isWinter();

        if (level == RiskLevel.LOW) {
            if (isWinter) {
                return "Температура в пределах зимней нормы";
            }
            return "Температура в безопасном диапазоне";
        }

        Double minTemp = weather.minTempRecord();
        if (minTemp == null) return "Данные о минимальной температуре недоступны";

        if (isWinter) {
            // Зимой другие пороги критичности
            return String.format("Минимальная температура %.1f°C — %s",
                    minTemp,
                    minTemp <= -30 ? "экстремальный мороз, опасен даже для озимых культур" :
                    minTemp <= -25 ? "сильный мороз, контролируйте состояние озимых" :
                    "мороз в пределах зимней нормы для озимых");
        }

        return String.format("Минимальная температура %.1f°C — %s",
                minTemp,
                minTemp <= -10 ? "критический заморозок, возможна гибель растений" :
                minTemp <= -5 ? "сильный заморозок, высокий риск повреждений" :
                minTemp <= 0 ? "заморозок, возможны повреждения всходов и цветения" :
                "приближение к точке замерзания");
    }

    private String describeHeatStressRisk(WeatherForecastData weather, RiskLevel level) {
        if (level == RiskLevel.LOW) return "Температурный режим в пределах нормы";
        StringBuilder sb = new StringBuilder();
        if (weather.heatStressDays() != null) {
            sb.append(String.format("%d дней с температурой > 30°C", weather.heatStressDays()));
        }
        if (weather.extremeHeatDays() != null && weather.extremeHeatDays() > 0) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(String.format("%d дней с экстремальной жарой > 35°C", weather.extremeHeatDays()));
        }
        sb.append(". Возможно снижение урожайности, ускоренное созревание");
        return sb.toString();
    }

    // ===== Рекомендации =====

    private List<String> generateRecommendations(
            RiskLevel drought, RiskLevel frost, RiskLevel heatStress,
            List<DiseaseRiskItem> diseaseRisks, WeatherForecastData weather) {

        List<String> recs = new ArrayList<>();

        boolean isWinter = isWinter();

        // Засуха (только если не зима)
        if (!isWinter) {
            if (drought == RiskLevel.CRITICAL || drought == RiskLevel.HIGH) {
                recs.add("🔴 Высокий риск засухи — рассмотрите орошение или мульчирование");
                if (weather.gtk() != null && weather.gtk() < 0.4) {
                    recs.add("⚠️ ГТК критически низкий — культуры под угрозой без дополнительного полива");
                }
            } else if (drought == RiskLevel.MEDIUM) {
                recs.add("🟡 Умеренный риск засухи — следите за влажностью почвы");
            }
        }

        // Заморозки (с учетом сезона)
        if (isWinter) {
            if (frost == RiskLevel.CRITICAL) {
                recs.add("🔴 Экстремальные морозы — контролируйте состояние озимых культур");
            } else if (frost == RiskLevel.HIGH) {
                recs.add("🟡 Сильные морозы — проверьте укрытие озимых, снежный покров");
            }
            // Зимой MEDIUM/LOW - норма, не добавляем рекомендации
        } else {
            if (frost == RiskLevel.CRITICAL || frost == RiskLevel.HIGH) {
                recs.add("🔴 Высокий риск заморозков — укройте посевы или отложите посев");
            } else if (frost == RiskLevel.MEDIUM) {
                recs.add("🟡 Возможны заморозки — подготовьте укрывные материалы");
            }
        }

        // Тепловой стресс
        if (heatStress == RiskLevel.CRITICAL || heatStress == RiskLevel.HIGH) {
            recs.add("🔴 Экстремальная жара — обеспечьте дополнительный полив, притенение");
        } else if (heatStress == RiskLevel.MEDIUM) {
            recs.add("🟡 Повышенный тепловой стресс — следите за состоянием растений");
        }

        // Болезни
        List<DiseaseRiskItem> criticalDiseases = diseaseRisks.stream()
                .filter(d -> d.riskLevel() == RiskLevel.CRITICAL || d.riskLevel() == RiskLevel.HIGH)
                .toList();

        for (DiseaseRiskItem disease : criticalDiseases) {
            recs.add(String.format("🔴 Высокий риск болезни '%s' — %s",
                    disease.diseaseName(),
                    disease.preventionAdvice() != null ? disease.preventionAdvice() : "примените профилактические меры"));
            if (disease.urgencyDays() != null) {
                recs.add(String.format("⏰ Необходимо принять меры в течение %d дней", disease.urgencyDays()));
            }
        }

        if (recs.isEmpty()) {
            recs.add("✅ Агрономические условия в пределах нормы. Значительных рисков не обнаружено.");
        }

        return recs;
    }

    private boolean isWinter() {
        Month m = LocalDateTime.now().getMonth();
        return m == Month.DECEMBER || m == Month.JANUARY || m == Month.FEBRUARY;
    }
    // ===== Утилиты =====

    private Double riskLevelToScore(RiskLevel level) {
        return switch (level) {
            case CRITICAL -> 0.95;
            case HIGH -> 0.75;
            case MEDIUM -> 0.50;
            case LOW -> 0.15;
        };
    }

    private RiskLevel scoreToRiskLevel(double score) {
        if (score >= 0.85) return RiskLevel.CRITICAL;
        if (score >= 0.60) return RiskLevel.HIGH;
        if (score >= 0.35) return RiskLevel.MEDIUM;
        return RiskLevel.LOW;
    }

    private String getSeasonWarning(int month) {
        return switch (month) {
            case 3, 4 -> "🌱 Весна: повышенный риск заморозков и возвратных холодов";
            case 5, 6 -> "☀️ Начало вегетации: следите за вредителями и болезнями";
            case 7, 8 -> "🌡️ Разгар лета: возможны засуха и тепловой стресс";
            case 9, 10 -> "🍂 Осень: риск грибковых заболеваний при высокой влажности";
            case 11, 12, 1, 2 -> "❄️ Зима: риск вымерзания озимых при сильных морозах";
            default -> null;
        };
    }
}

