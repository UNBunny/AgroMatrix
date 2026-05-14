package com.omstu.agriculturefield.protection.service;

import com.omstu.agriculturefield.protection.dto.CatalogFilterRequest;
import com.omstu.agriculturefield.protection.dto.CatalogFilterResponse;
import com.omstu.agriculturefield.protection.dto.ProductRecommendationDto;
import com.omstu.agriculturefield.protection.model.CropProtectionCatalogEntry;
import com.omstu.agriculturefield.protection.repository.CropProtectionCatalogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Фильтрует каталог средств защиты по воронке:
// cropCode → BBCH окно → тип болезни → температура → ML-патоген → FRAC-разнообразие → дедупликация
@Service
@RequiredArgsConstructor
@Slf4j
public class CatalogFilterService {

    private static final int MAX_RECOMMENDATIONS = 10;

    private final CropProtectionCatalogRepository repository;

    // ── Public API ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CatalogFilterResponse filter(CatalogFilterRequest req) {
        log.info("Catalog filter: crop={}, bbch={}, type={}, T={}°C, LWH={}h, ML={}",
                req.cropCode(), req.bbchStage(), req.diseaseType(),
                req.tempC(), req.leafWetnessHours(), req.mlRiskLevel());

        // Stage 1 — load
        List<CropProtectionCatalogEntry> all = repository.findActiveByCropCode(req.cropCode());
        int total = all.size();

        // Stage 2 — BBCH window
        List<CropProtectionCatalogEntry> bbchOk = filterByBbch(all, req.bbchStage());
        int afterBbch = bbchOk.size();

        // Stage 3 — disease / threat type
        List<CropProtectionCatalogEntry> typeOk = filterByDiseaseType(bbchOk, req.diseaseType());
        int afterType = typeOk.size();

        // Stage 4 — temperature gate (with fallback: returns full list when nothing passes)
        List<CropProtectionCatalogEntry> tempOk = filterByTemperature(typeOk, req.tempC());
        int afterTemp = tempOk.size();

        // Stage 5 — ML pathogen narrowing (fallback: all remaining entries when no match)
        List<CropProtectionCatalogEntry> candidates = narrowByPathogen(tempOk, req.mlPathogenName());

        // Stage 6 — FRAC diversity (≤2 per primary code, combos first)
        List<CropProtectionCatalogEntry> diverse = applyFracDiversity(candidates);

        // Stage 6b — Deduplicate: same product can appear per-disease; keep one entry per product name
        List<CropProtectionCatalogEntry> deduped = deduplicateByProduct(diverse);

        // Stage 7 — map to DTOs with rationale
        List<ProductRecommendationDto> recommendations = deduped.stream()
                .map(e -> buildRecommendation(e, req))
                .collect(Collectors.toList());

        List<String> fracs = recommendations.stream()
                .map(ProductRecommendationDto::fracCode)
                .filter(f -> f != null && !f.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        String summary = buildSummary(req, total, afterBbch, afterType, afterTemp,
                diverse.size(), recommendations.size());
        log.info("Filter result: {}/{} entries selected for crop={}", recommendations.size(), total, req.cropCode());

        return new CatalogFilterResponse(
                req.cropCode(),
                req.bbchStage(),
                req.diseaseType(),
                total, afterBbch, afterType, afterTemp,
                recommendations.size(),
                recommendations,
                fracs,
                summary);
    }

    // ── Stage 2: BBCH window ─────────────────────────────────────────────────

    private List<CropProtectionCatalogEntry> filterByBbch(
            List<CropProtectionCatalogEntry> entries, Integer bbchStage) {
        if (bbchStage == null) return entries;
        return entries.stream()
                .filter(e -> {
                    // Seed treatments (bbch 0/0) are pre-season only
                    if ("SEED_TREATMENT".equals(e.getApplicationType())
                            && Integer.valueOf(0).equals(e.getBbchFrom())
                            && Integer.valueOf(0).equals(e.getBbchTo())) {
                        return bbchStage == 0;
                    }
                    // Entries without BBCH constraints are universally applicable
                    if (e.getBbchFrom() == null || e.getBbchTo() == null) return true;
                    return e.getBbchFrom() <= bbchStage && bbchStage <= e.getBbchTo();
                })
                .collect(Collectors.toList());
    }

    // ── Stage 3: Disease / threat type ───────────────────────────────────────

    private List<CropProtectionCatalogEntry> filterByDiseaseType(
            List<CropProtectionCatalogEntry> entries, String diseaseType) {
        if (diseaseType == null || diseaseType.isBlank()) return entries;
        List<CropProtectionCatalogEntry> filtered = entries.stream()
                .filter(e -> diseaseType.equalsIgnoreCase(e.getDiseaseType()))
                .collect(Collectors.toList());
        return filtered.isEmpty() ? entries : filtered;
    }

    // ── Stage 4: Temperature gate ─────────────────────────────────────────────

    // если ничего не прошло по температуре — возвращаем всё (не хотим пустой список)
    private List<CropProtectionCatalogEntry> filterByTemperature(
            List<CropProtectionCatalogEntry> entries, Double tempC) {
        if (tempC == null) return entries;
        List<CropProtectionCatalogEntry> suitable = entries.stream()
                .filter(e -> (e.getTempMinC() == null || tempC >= e.getTempMinC())
                          && (e.getTempMaxC() == null || tempC <= e.getTempMaxC()))
                .collect(Collectors.toList());
        return suitable.isEmpty() ? entries : suitable;
    }

    // ── Stage 5: ML pathogen narrowing ────────────────────────────────────────

    // сужаем по патогену из ML если есть, при промахе — возвращаем всё
    private List<CropProtectionCatalogEntry> narrowByPathogen(
            List<CropProtectionCatalogEntry> entries, String mlPathogenName) {
        if (mlPathogenName == null || mlPathogenName.isBlank()) return entries;
        String needle = mlPathogenName.toLowerCase();
        List<CropProtectionCatalogEntry> narrowed = entries.stream()
                .filter(e -> matchesPathogen(e, needle))
                .collect(Collectors.toList());
        if (narrowed.isEmpty()) {
            log.debug("ML pathogen '{}' not matched in catalog — returning all {} candidates",
                    mlPathogenName, entries.size());
        }
        return narrowed.isEmpty() ? entries : narrowed;
    }

    private boolean matchesPathogen(CropProtectionCatalogEntry e, String needle) {
        return (e.getDiseaseName() != null && e.getDiseaseName().toLowerCase().contains(needle))
            || (e.getPathogenLatin() != null && e.getPathogenLatin().toLowerCase().contains(needle));
    }

    // ── Stage 6: FRAC diversity + deduplication ─────────────────────────────────

    // не более 2 продуктов с одним FRAC-кодом, комбо-препараты идут первыми
    private List<CropProtectionCatalogEntry> applyFracDiversity(
            List<CropProtectionCatalogEntry> entries) {
        Map<String, Integer> fracCount = new HashMap<>();
        return entries.stream()
                .sorted(Comparator
                        .comparingInt((CropProtectionCatalogEntry e) ->
                                e.getFracCode() != null && e.getFracCode().contains("+") ? 0 : 1)
                        .thenComparing(CropProtectionCatalogEntry::getProductName,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .filter(e -> {
                    String primary = (e.getFracCode() != null && !e.getFracCode().isBlank())
                            ? e.getFracCode().split("\\+")[0].strip()
                            : "UNKNOWN";
                    int count = fracCount.getOrDefault(primary, 0);
                    if (count < 2) {
                        fracCount.put(primary, count + 1);
                        return true;
                    }
                    return false;
                })
                .collect(Collectors.toList());
    }

    // один препарат может быть для нескольких болезней — оставляем первое вхождение
    private List<CropProtectionCatalogEntry> deduplicateByProduct(
            List<CropProtectionCatalogEntry> entries) {
        Map<String, CropProtectionCatalogEntry> seen = new LinkedHashMap<>();
        for (CropProtectionCatalogEntry e : entries) {
            String key = e.getProductName() != null
                    ? e.getProductName().strip().toLowerCase()
                    : String.valueOf(e.getId());
            seen.putIfAbsent(key, e);
        }
        return seen.values().stream()
                .limit(MAX_RECOMMENDATIONS)
                .collect(Collectors.toList());
    }

    // ── Stage 7: Rationale assembly ───────────────────────────────────────────

    private ProductRecommendationDto buildRecommendation(
            CropProtectionCatalogEntry e, CatalogFilterRequest req) {
        List<String> parts = new ArrayList<>();

        // BBCH window
        if (e.getBbchFrom() != null && e.getBbchTo() != null && req.bbchStage() != null) {
            parts.add(String.format("BBCH %d–%d: фаза %d в окне применения",
                    e.getBbchFrom(), e.getBbchTo(), req.bbchStage()));
        }

        // Temperature context
        if (req.tempC() != null) {
            if (e.getTempOptC() != null && Math.abs(req.tempC() - e.getTempOptC()) <= 3.0) {
                parts.add(String.format("T %.1f°C близка к оптимальной (%.0f°C) препарата",
                        req.tempC(), e.getTempOptC()));
            } else if (e.getTempMinC() != null && e.getTempMaxC() != null) {
                parts.add(String.format("Рабочий диапазон %.0f–%.0f°C: текущая T %.1f°C допустима",
                        e.getTempMinC(), e.getTempMaxC(), req.tempC()));
            }
        }

        // Leaf-wetness hours (critical for fungal pathogens)
        if ("FUNGAL".equalsIgnoreCase(req.diseaseType()) && req.leafWetnessHours() != null) {
            double lwh = req.leafWetnessHours();
            if (lwh >= 12) {
                parts.add(String.format("LWH %.0f ч — КРИТИЧЕСКИЙ порог: гарантированное заражение",
                        lwh));
            } else if (lwh >= 8) {
                parts.add(String.format("LWH %.0f ч — высокий риск заражения", lwh));
            } else if (lwh >= 4) {
                parts.add(String.format("LWH %.0f ч — умеренный риск заражения", lwh));
            }
        }

        // Humidity context for fungal
        if (req.humidity() != null && req.humidity() >= 85
                && "FUNGAL".equalsIgnoreCase(req.diseaseType())) {
            parts.add(String.format("Влажность %.0f%% — благоприятна для споруляции патогенов",
                    req.humidity()));
        }

        // FRAC code / resistance management
        if (e.getFracCode() != null && !e.getFracCode().isBlank()) {
            if (e.getFracCode().contains("+")) {
                parts.add(String.format("Мульти-сайт FRAC %s (%s) снижает риск резистентности",
                        e.getFracCode(),
                        e.getFracGroup() != null ? e.getFracGroup() : "—"));
            } else {
                parts.add(String.format("FRAC %s (%s)",
                        e.getFracCode(),
                        e.getFracGroup() != null ? e.getFracGroup() : "—"));
            }
        }

        // ML risk level — woven into rationale when the caller passes ML output
        if (req.mlRiskLevel() != null) {
            switch (req.mlRiskLevel().toUpperCase()) {
                case "CRITICAL" -> parts.add("ML-модель: КРИТИЧЕСКИЙ риск — немедленная обработка");
                case "HIGH"     -> parts.add("ML-модель: Высокий риск — срочная профилактическая обработка");
                case "MEDIUM"   -> parts.add("ML-модель: Умеренный риск — профилактика рекомендуется");
                case "LOW"      -> parts.add("ML-модель: Низкий риск — мониторинг, обработка по необходимости");
            }
        }

        // ML infection index as a numeric hint
        if (req.mlInfectionIndex() != null) {
            parts.add(String.format("Индекс заражения (ML): %.3f", req.mlInfectionIndex()));
        }

        boolean isOptimalTemp = req.tempC() != null && e.getTempOptC() != null
                && Math.abs(req.tempC() - e.getTempOptC()) <= 3.0;

        return new ProductRecommendationDto(
                e.getId(),
                e.getDiseaseName(),
                e.getPathogenLatin(),
                e.getDiseaseType(),
                e.getProductName(),
                e.getActiveIngredients(),
                e.getAiConcentration(),
                e.getFracCode(),
                e.getFracGroup(),
                e.getDoseRate(),
                e.getDoseValue(),
                e.getDoseUnit(),
                e.getApplicationType(),
                e.getBbchFrom(),
                e.getBbchTo(),
                e.getTempMinC(),
                e.getTempOptC(),
                e.getTempMaxC(),
                e.getPhiDays(),
                parts.isEmpty() ? "Препарат соответствует условиям применения"
                                : String.join("; ", parts),
                isOptimalTemp);
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    private String buildSummary(CatalogFilterRequest req, int total, int afterBbch,
                                int afterType, int afterTemp, int afterFrac, int finalCount) {
        return String.format(
                "Культура: %s | BBCH: %s | Тип: %s | "
                + "T: %s°C | Влажность: %s%% | LWH: %sч | "
                + "ML: %s | Воронка: %d→%d→%d→%d→%d→%d",
                req.cropCode(),
                req.bbchStage() != null ? req.bbchStage() : "—",
                req.diseaseType() != null ? req.diseaseType() : "ВСЕ",
                req.tempC() != null ? String.format("%.1f", req.tempC()) : "—",
                req.humidity() != null ? String.format("%.0f", req.humidity()) : "—",
                req.leafWetnessHours() != null ? String.format("%.0f", req.leafWetnessHours()) : "—",
                req.mlRiskLevel() != null ? req.mlRiskLevel() : "—",
                total, afterBbch, afterType, afterTemp, afterFrac, finalCount);
    }
}
