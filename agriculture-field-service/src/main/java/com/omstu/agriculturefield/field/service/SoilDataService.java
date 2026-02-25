package com.omstu.agriculturefield.field.service;

import com.omstu.agriculturefield.field.dto.SoilDataDto;
import com.omstu.agriculturefield.field.dto.SoilDataRequest;

public interface SoilDataService {

    SoilDataDto getSoilDataForField(Long fieldId);

    SoilDataDto fetchAndSaveFromSoilGrids(Long fieldId);

    SoilDataDto updateSoilDataManually(Long fieldId, SoilDataRequest request);

    SoilDataDto createOrUpdateSoilData(Long fieldId, SoilDataRequest request, boolean isManual);
}
