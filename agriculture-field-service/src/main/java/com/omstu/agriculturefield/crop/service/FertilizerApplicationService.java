package com.omstu.agriculturefield.crop.service;

import com.omstu.agriculturefield.crop.dto.FertilizerApplicationRequest;
import com.omstu.agriculturefield.crop.dto.FertilizerApplicationResponse;

import java.util.List;

public interface FertilizerApplicationService {
    List<FertilizerApplicationResponse> getByCropHistoryId(Long cropHistoryId);
    FertilizerApplicationResponse getById(Long id);
    FertilizerApplicationResponse create(FertilizerApplicationRequest request);
    FertilizerApplicationResponse update(Long id, FertilizerApplicationRequest request);
    void delete(Long id);
}
