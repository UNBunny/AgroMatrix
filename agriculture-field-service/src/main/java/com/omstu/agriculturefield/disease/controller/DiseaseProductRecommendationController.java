package com.omstu.agriculturefield.disease.controller;

import com.omstu.agriculturefield.disease.dto.DiseaseProductRecommendationResponse;
import com.omstu.agriculturefield.disease.service.DiseaseProductRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/disease-product-recommendations")
@RequiredArgsConstructor
@Slf4j
public class DiseaseProductRecommendationController {

    private final DiseaseProductRecommendationService service;

    @GetMapping
    public List<DiseaseProductRecommendationResponse> getAll() {
        return service.findAll();
    }

    @GetMapping("/search")
    public ResponseEntity<DiseaseProductRecommendationResponse> search(
            @RequestParam String disease
    ) {
        log.debug("Поиск рекомендации для болезни: '{}'", disease);
        return service.findByDiseaseName(disease)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
