package com.omstu.agriculturefield.crop.service;

import com.omstu.agriculturefield.crop.dto.PlantProtectionRequest;
import com.omstu.agriculturefield.crop.dto.PlantProtectionResponse;

import java.util.List;

public interface PlantProtectionService {
    List<PlantProtectionResponse> getByCropHistoryId(Long cropHistoryId);
    PlantProtectionResponse getById(Long id);
    PlantProtectionResponse create(PlantProtectionRequest request);
    PlantProtectionResponse update(Long id, PlantProtectionRequest request);
    void delete(Long id);
}
