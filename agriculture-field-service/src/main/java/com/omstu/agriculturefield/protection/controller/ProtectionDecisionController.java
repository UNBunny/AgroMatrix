package com.omstu.agriculturefield.protection.controller;

import com.omstu.agriculturefield.protection.dto.CatalogFilterRequest;
import com.omstu.agriculturefield.protection.dto.CatalogFilterResponse;
import com.omstu.agriculturefield.protection.dto.ProtectionAnalysisRequest;
import com.omstu.agriculturefield.protection.dto.ThreatAnalysisResponse;
import com.omstu.agriculturefield.protection.service.CatalogFilterService;
import com.omstu.agriculturefield.protection.service.ProtectionDecisionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/protection")
@RequiredArgsConstructor
@Slf4j
public class ProtectionDecisionController {

    private final ProtectionDecisionService protectionDecisionService;
    private final CatalogFilterService catalogFilterService;

    @PostMapping("/analyze")
    public Mono<ResponseEntity<ThreatAnalysisResponse>> analyze(
            @RequestBody ProtectionAnalysisRequest request) {
        log.info("Protection analyze: fieldId={}, bbch={}, diseases={}",
                request.fieldId(), request.bbchStage(), request.targetDiseases());
        return protectionDecisionService.analyze(request)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.noContent().build());
    }

    @PostMapping("/filter")
    public ResponseEntity<CatalogFilterResponse> filter(
            @RequestBody CatalogFilterRequest request) {
        log.info("Catalog filter: crop={}, bbch={}, type={}, mlRisk={}",
                request.cropCode(), request.bbchStage(),
                request.diseaseType(), request.mlRiskLevel());
        return ResponseEntity.ok(catalogFilterService.filter(request));
    }
}
