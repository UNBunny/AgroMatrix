package com.omstu.agriculturefield.crop.mapper;

import com.omstu.agriculturefield.crop.dto.FertilizerApplicationRequest;
import com.omstu.agriculturefield.crop.dto.FertilizerApplicationResponse;
import com.omstu.agriculturefield.crop.model.FertilizerApplication;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface FertilizerApplicationMapper {

    @Mapping(target = "cropHistoryId", source = "cropHistory.id")
    @Mapping(target = "cropTypeName", source = "cropHistory.cropType.name")
    @Mapping(target = "fieldName", source = "cropHistory.field.fieldName")
    FertilizerApplicationResponse toResponse(FertilizerApplication entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "cropHistory", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    FertilizerApplication toEntity(FertilizerApplicationRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "cropHistory", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    void updateEntity(FertilizerApplicationRequest request, @MappingTarget FertilizerApplication entity);
}
