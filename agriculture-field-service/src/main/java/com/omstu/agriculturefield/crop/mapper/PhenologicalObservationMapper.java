package com.omstu.agriculturefield.crop.mapper;

import com.omstu.agriculturefield.crop.dto.PhenologicalObservationRequest;
import com.omstu.agriculturefield.crop.dto.PhenologicalObservationResponse;
import com.omstu.agriculturefield.crop.model.PhenologicalObservation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PhenologicalObservationMapper {

    @Mapping(target = "cropHistoryId", source = "cropHistory.id")
    @Mapping(target = "cropTypeName", source = "cropHistory.cropType.name")
    @Mapping(target = "fieldName", source = "cropHistory.field.fieldName")
    PhenologicalObservationResponse toResponse(PhenologicalObservation observation);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "cropHistory", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    PhenologicalObservation toEntity(PhenologicalObservationRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "cropHistory", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    void updateEntity(PhenologicalObservationRequest request, @MappingTarget PhenologicalObservation entity);
}
