package com.omstu.ndvi.mapper;

import com.omstu.ndvi.dto.NdviRecordDto;
import com.omstu.ndvi.model.NdviRecord;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NdviRecordMapper {

    @Mapping(target = "date", source = "recordDate")
    @Mapping(target = "mean", source = "ndviMean")
    @Mapping(target = "min", source = "ndviMin")
    @Mapping(target = "max", source = "ndviMax")
    @Mapping(target = "std", source = "ndviStd")
    NdviRecordDto toDto(NdviRecord record);
}
