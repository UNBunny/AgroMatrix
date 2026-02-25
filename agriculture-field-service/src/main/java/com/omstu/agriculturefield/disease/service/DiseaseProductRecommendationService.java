package com.omstu.agriculturefield.disease.service;

import com.omstu.agriculturefield.disease.dto.DiseaseProductItemResponse;
import com.omstu.agriculturefield.disease.dto.DiseaseProductRecommendationResponse;
import com.omstu.agriculturefield.disease.model.DiseaseProductRecommendation;
import com.omstu.agriculturefield.disease.repository.DiseaseProductRecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

// подбирает рекомендацию препарата по keywords: ищет запись, где название болезни содержит подстроку из keywords
@Service
@Slf4j
@RequiredArgsConstructor
public class DiseaseProductRecommendationService {

    private final DiseaseProductRecommendationRepository repository;

    @Transactional(readOnly = true)
    public Optional<DiseaseProductRecommendationResponse> findByDiseaseName(String diseaseName) {
        if (diseaseName == null || diseaseName.isBlank()) {
            return Optional.empty();
        }
        String lower = diseaseName.toLowerCase().trim();
        List<DiseaseProductRecommendation> all = repository.findAllByIsActiveTrue();

        return all.stream()
                .filter(rec -> matchesAnyKeyword(lower, rec.getKeywords()))
                .findFirst()
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<DiseaseProductRecommendationResponse> findAll() {
        return repository.findAllByIsActiveTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private boolean matchesAnyKeyword(String diseaseLower, String keywords) {
        if (keywords == null || keywords.isBlank()) return false;
        return Arrays.stream(keywords.split(","))
                .map(String::trim)
                .filter(kw -> !kw.isEmpty())
                .anyMatch(diseaseLower::contains);
    }

    private DiseaseProductRecommendationResponse toResponse(DiseaseProductRecommendation rec) {
        List<DiseaseProductItemResponse> items = rec.getProducts().stream()
                .map(p -> new DiseaseProductItemResponse(
                        p.getId(),
                        p.getName(),
                        p.getActiveIngredient(),
                        p.getMechanism(),
                        p.getDose(),
                        p.getDoseValue(),
                        p.getTiming(),
                        p.getPhiDays()
                ))
                .toList();

        return new DiseaseProductRecommendationResponse(
                rec.getId(),
                rec.getOpType(),
                rec.getOpLabel(),
                rec.getOpColor(),
                rec.getOpEmoji(),
                rec.getReason(),
                items
        );
    }
}
