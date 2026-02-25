package com.omstu.agriculturefield.field.controller;

import com.omstu.agriculturefield.field.dto.SoilDataDto;
import com.omstu.agriculturefield.field.dto.SoilDataRequest;
import com.omstu.agriculturefield.field.service.SoilDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fields/{fieldId}/soil")
@RequiredArgsConstructor
@Slf4j
public class SoilDataController {

    private final SoilDataService soilDataService;

    @GetMapping
    public ResponseEntity<SoilDataDto> getSoilData(@PathVariable Long fieldId) {
        log.info("Fetching soil data for field {}", fieldId);
        return ResponseEntity.ok(soilDataService.getSoilDataForField(fieldId));
    }

    @PostMapping("/fetch")
    public ResponseEntity<SoilDataDto> fetchFromSoilGrids(@PathVariable Long fieldId) {
        log.info("Fetching soil data from SoilGrids for field {}", fieldId);
        return ResponseEntity.ok(soilDataService.fetchAndSaveFromSoilGrids(fieldId));
    }

    @PostMapping
    public ResponseEntity<SoilDataDto> createSoilData(
            @PathVariable Long fieldId,
            @Valid @RequestBody SoilDataRequest request) {
        log.info("Creating manual soil data for field {}", fieldId);
        return ResponseEntity.ok(soilDataService.createOrUpdateSoilData(fieldId, request, true));
    }

    @PutMapping
    public ResponseEntity<SoilDataDto> updateSoilData(
            @PathVariable Long fieldId,
            @Valid @RequestBody SoilDataRequest request) {
        log.info("Updating manual soil data for field {}", fieldId);
        return ResponseEntity.ok(soilDataService.updateSoilDataManually(fieldId, request));
    }
}
