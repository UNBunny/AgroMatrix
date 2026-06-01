package com.omstu.agriculturefield.field.service;

import com.omstu.agriculturefield.field.dto.AgriculturalFieldRequest;
import com.omstu.agriculturefield.field.dto.AgriculturalFieldResponse;

import java.util.List;

public interface FieldService {
    AgriculturalFieldResponse createField(AgriculturalFieldRequest request, Long farmId);
    AgriculturalFieldResponse updateField(Long id, AgriculturalFieldRequest request, Long farmId);
    AgriculturalFieldResponse getFieldById(Long id, Long farmId);
    List<AgriculturalFieldResponse> getAllFields(Long farmId);
    void deleteField(Long id, Long farmId);
}
