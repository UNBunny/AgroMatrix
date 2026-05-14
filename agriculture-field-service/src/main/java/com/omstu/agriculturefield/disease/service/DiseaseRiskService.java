package com.omstu.agriculturefield.disease.service;

import com.omstu.agriculturefield.disease.dto.DiseaseRiskResponse;
import reactor.core.publisher.Mono;

public interface DiseaseRiskService {
    Mono<DiseaseRiskResponse> assessFieldRisk(Long fieldId, String cropName);
}
