package com.omstu.agriculturefield.disease.controller;

import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.disease.dto.DiseaseRiskResponse;
import com.omstu.agriculturefield.disease.model.enums.SupportedCrop;
import com.omstu.agriculturefield.disease.service.DiseaseRiskService;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;


@RestController
@RequestMapping("/api/fields")
@RequiredArgsConstructor
@Slf4j
public class DiseaseRiskController {

    private final DiseaseRiskService diseaseRiskService;
    private final AgriculturalFieldRepository fieldRepository;

    @GetMapping("/{fieldId}/disease-risk")
    public Mono<ResponseEntity<DiseaseRiskResponse>> getDiseaseRisk(
            @PathVariable Long fieldId,
            @RequestParam(required = false) String crop
    ) {
        log.info("Запрос оценки рисков для поля {} с культурой '{}'", fieldId, crop);

        // Validate field exists
        AgriculturalField field = fieldRepository.findById(fieldId)
                .orElseThrow(() -> new NotFoundException("Field not found with id: " + fieldId));

        // Validate crop parameter is present
        if (crop == null || crop.trim().isEmpty()) {
            throw new ValidationException("Crop parameter is required");
        }

        // Validate crop is supported
        try {
            SupportedCrop.fromRussianName(crop);
        } catch (IllegalArgumentException e) {
            log.warn("Неподдерживаемая культура: {}", crop);
            throw new ValidationException("Unknown crop: " + crop);
        }

        return diseaseRiskService.assessFieldRisk(fieldId, crop)
                .map(ResponseEntity::ok)
                .doOnSuccess(resp -> log.info("Оценка рисков для поля {} завершена: общий уровень = {}",
                        fieldId, resp.getBody() != null ? resp.getBody().overallRiskLevel() : "N/A"));
    }
}

