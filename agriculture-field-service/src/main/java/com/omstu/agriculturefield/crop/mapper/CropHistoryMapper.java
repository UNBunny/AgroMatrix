package com.omstu.agriculturefield.crop.mapper;

import com.omstu.agriculturefield.crop.dto.CropHistoryRequest;
import com.omstu.agriculturefield.crop.dto.CropHistoryResponse;
import com.omstu.agriculturefield.crop.model.CropHistory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CropHistoryMapper {

    @Mapping(target = "fieldId", source = "field.id")
    @Mapping(target = "fieldName", source = "field.fieldName")
    @Mapping(target = "cropTypeId", source = "cropType.id")
    @Mapping(target = "cropTypeName", source = "cropType.name")
    @Mapping(target = "cropVarietyId", source = "cropVariety.id")
    @Mapping(target = "cropVarietyName", source = "cropVariety.name")
    CropHistoryResponse toResponse(CropHistory cropHistory);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "field", ignore = true)
    @Mapping(target = "cropType", ignore = true)
    @Mapping(target = "cropVariety", ignore = true)
    CropHistory toEntity(CropHistoryRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "field", ignore = true)
    @Mapping(target = "cropType", ignore = true)
    @Mapping(target = "cropVariety", ignore = true)
    void updateEntity(CropHistoryRequest request, @MappingTarget CropHistory entity);
}