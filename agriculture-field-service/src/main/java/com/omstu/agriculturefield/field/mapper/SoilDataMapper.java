package com.omstu.agriculturefield.field.mapper;

import com.omstu.agriculturefield.field.dto.SoilDataDto;
import com.omstu.agriculturefield.field.dto.SoilDataRequest;
import com.omstu.agriculturefield.field.model.SoilData;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SoilDataMapper {

    @Mapping(target = "fieldId", source = "field.id")
    SoilDataDto toDto(SoilData soilData);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "field", ignore = true)
    @Mapping(target = "source", ignore = true)
    @Mapping(target = "confidence", ignore = true)
    @Mapping(target = "soilgridsVersion", ignore = true)
    @Mapping(target = "lastSyncedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateFromRequest(SoilDataRequest request, @MappingTarget SoilData soilData);
}
