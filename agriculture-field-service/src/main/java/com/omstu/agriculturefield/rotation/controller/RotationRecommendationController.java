package com.omstu.agriculturefield.rotation.controller;

import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.crop.model.CropType;
import com.omstu.agriculturefield.crop.repository.CropTypeRepository;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import com.omstu.agriculturefield.rotation.dto.ClimateSuitabilityAnalysis;
import com.omstu.agriculturefield.rotation.dto.CropRecommendationResponse;
import com.omstu.agriculturefield.rotation.service.CropClimateSuitabilityService;
import com.omstu.agriculturefield.rotation.service.RotationRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Year;

@RestController
@RequestMapping("/api/fields")
@RequiredArgsConstructor
@Slf4j
public class RotationRecommendationController {

    private final RotationRecommendationService rotationRecommendationService;
    private final CropClimateSuitabilityService climateSuitabilityService;
    private final CropTypeRepository cropTypeRepository;
    private final AgriculturalFieldRepository fieldRepository;

    @GetMapping("/{fieldId}/recommendations")
    public CropRecommendationResponse getRecommendations(
            @PathVariable Long fieldId,
            @RequestParam(required = false) Integer year
    ) {
        // Validate field exists
        if (!fieldRepository.existsById(fieldId)) {
            throw new NotFoundException("Field not found with id: " + fieldId);
        }

        int targetYear = year != null ? year : Year.now().getValue();
        log.info("Fetching crop recommendations for fieldId={}, targetYear={}", fieldId, targetYear);
        return rotationRecommendationService.getRecommendations(fieldId, targetYear);
    }

    @GetMapping("/{fieldId}/climate-suitability/{cropTypeId}")
    public ResponseEntity<ClimateSuitabilityAnalysis> getClimateSuitability(
            @PathVariable Long fieldId,
            @PathVariable Long cropTypeId,
            @RequestParam(required = false) Integer years
    ) {
        log.info("Fetching climate suitability for fieldId={}, cropTypeId={}, years={}", fieldId, cropTypeId, years);

        // Validate years parameter
        if (years != null && years <= 0) {
            throw new ValidationException("Years parameter must be positive");
        }

        AgriculturalField field = fieldRepository.findById(fieldId)
                .orElseThrow(() -> new NotFoundException("Field not found with id: " + fieldId));

        CropType cropType = cropTypeRepository.findById(cropTypeId)
                .orElseThrow(() -> new NotFoundException("Crop type not found with id: " + cropTypeId));

        ClimateSuitabilityAnalysis analysis = climateSuitabilityService.analyzeSuitability(field, cropType, years);

        return ResponseEntity.ok(analysis);
    }
}
