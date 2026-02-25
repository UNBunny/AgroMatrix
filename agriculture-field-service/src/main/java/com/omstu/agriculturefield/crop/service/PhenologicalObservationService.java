package com.omstu.agriculturefield.crop.service;

import com.omstu.agriculturefield.crop.dto.PhenologicalObservationRequest;
import com.omstu.agriculturefield.crop.dto.PhenologicalObservationResponse;

import java.util.List;

public interface PhenologicalObservationService {
    List<PhenologicalObservationResponse> getByCropHistoryId(Long cropHistoryId);
    PhenologicalObservationResponse getById(Long id);
    PhenologicalObservationResponse create(PhenologicalObservationRequest request);
    PhenologicalObservationResponse update(Long id, PhenologicalObservationRequest request);
    void delete(Long id);
}
