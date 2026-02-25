package com.omstu.agriculturefield.field.mapper;

import com.omstu.agriculturefield.field.dto.SoilHorizonRequest;
import com.omstu.agriculturefield.field.dto.SoilHorizonResponse;
import com.omstu.agriculturefield.field.model.SoilHorizon;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SoilHorizonMapper {

    @Mapping(target = "fieldId", source = "field.id")
    @Mapping(target = "fieldName", source = "field.fieldName")
    SoilHorizonResponse toResponse(SoilHorizon horizon);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "field", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    SoilHorizon toEntity(SoilHorizonRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "field", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    void updateEntity(SoilHorizonRequest request, @MappingTarget SoilHorizon entity);
}
