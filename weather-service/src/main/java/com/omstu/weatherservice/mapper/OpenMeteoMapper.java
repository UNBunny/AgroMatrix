package com.omstu.weatherservice.mapper;

import com.omstu.weatherservice.dto.Daily;
import com.omstu.weatherservice.dto.Hourly;
import com.omstu.weatherservice.dto.OpenMeteoResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(componentModel = "spring", uses = {HourlyMapper.class, DailyMapper.class})
public interface OpenMeteoMapper {

    OpenMeteoMapper INSTANCE = Mappers.getMapper(OpenMeteoMapper.class);

    default OpenMeteoResponse combineResponses(List<OpenMeteoResponse> responses) {
        if (responses == null || responses.isEmpty()) {
            throw new IllegalStateException("No successful responses received");
        }

        OpenMeteoResponse first = responses.get(0);

        Hourly combinedHourly = HourlyMapper.INSTANCE.combineHourlyList(
                responses.stream().map(OpenMeteoResponse::hourly).toList()
        );

        Daily combinedDaily = DailyMapper.INSTANCE.combineDailyList(
                responses.stream().map(OpenMeteoResponse::daily).toList(),
                responses.stream().map(OpenMeteoResponse::hourly).toList()
        );

        return new OpenMeteoResponse(
                first.latitude(),
                first.longitude(),
                first.elevation(),
                combinedHourly,
                combinedDaily
        );
    }

}