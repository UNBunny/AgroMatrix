package com.omstu.agriculturefield.crop.mapper;

import com.omstu.agriculturefield.crop.dto.PlantProtectionRequest;
import com.omstu.agriculturefield.crop.dto.PlantProtectionResponse;
import com.omstu.agriculturefield.crop.model.PlantProtectionOperation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PlantProtectionMapper {

    @Mapping(target = "cropHistoryId", source = "cropHistory.id")
    @Mapping(target = "cropTypeName", source = "cropHistory.cropType.name")
    @Mapping(target = "fieldName", source = "cropHistory.field.fieldName")
    PlantProtectionResponse toResponse(PlantProtectionOperation entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "cropHistory", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    PlantProtectionOperation toEntity(PlantProtectionRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "cropHistory", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    void updateEntity(PlantProtectionRequest request, @MappingTarget PlantProtectionOperation entity);
}
