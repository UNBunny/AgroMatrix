package com.omstu.agriculturefield.field.service;

import com.omstu.agriculturefield.field.dto.SoilHorizonRequest;
import com.omstu.agriculturefield.field.dto.SoilHorizonResponse;

import java.util.List;

public interface SoilHorizonService {
    List<SoilHorizonResponse> getByFieldId(Long fieldId);
    SoilHorizonResponse getById(Long id);
    SoilHorizonResponse create(SoilHorizonRequest request);
    SoilHorizonResponse update(Long id, SoilHorizonRequest request);
    void delete(Long id);
}
