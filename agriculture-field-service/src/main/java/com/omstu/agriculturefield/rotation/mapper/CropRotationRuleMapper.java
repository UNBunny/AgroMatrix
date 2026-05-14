package com.omstu.agriculturefield.rotation.mapper;

import com.omstu.agriculturefield.rotation.dto.CropRotationRuleRequest;
import com.omstu.agriculturefield.rotation.dto.CropRotationRuleResponse;
import com.omstu.agriculturefield.rotation.model.CropRotationRule;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CropRotationRuleMapper {

    @Mapping(target = "predecessorCropId", source = "predecessorCrop.id")
    @Mapping(target = "predecessorCropName", source = "predecessorCrop.name")
    @Mapping(target = "successorCropId", source = "successorCrop.id")
    @Mapping(target = "successorCropName", source = "successorCrop.name")
    @Mapping(target = "recommendationScore", expression = "java(rule.getRecommendation() != null ? rule.getRecommendation().score : null)")
    @Mapping(target = "recommendationRationale", expression = "java(rule.getRecommendation() != null ? rule.getRecommendation().agronomicRationale : null)")
    CropRotationRuleResponse toResponse(CropRotationRule rule);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "predecessorCrop", ignore = true)
    @Mapping(target = "successorCrop", ignore = true)
    CropRotationRule toEntity(CropRotationRuleRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "predecessorCrop", ignore = true)
    @Mapping(target = "successorCrop", ignore = true)
    void updateEntity(CropRotationRuleRequest request, @MappingTarget CropRotationRule entity);
}