package com.omstu.weatherservice.mapper;

import com.omstu.weatherservice.dto.Daily;
import com.omstu.weatherservice.dto.Hourly;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

@Mapper(componentModel = "spring")
public interface DailyMapper {

    DailyMapper INSTANCE = Mappers.getMapper(DailyMapper.class);
    Logger logger = LoggerFactory.getLogger(DailyMapper.class);

    default Daily combineDailyList(List<Daily> dailyList, List<Hourly> hourlyList) {
        if (dailyList == null || dailyList.isEmpty()) {
            return null;
        }

        CombinedDailyData combinedData = combineDailyData(dailyList);
        Map<String, HourlyDataForDate> hourlyByDate = groupHourlyDataByDate(hourlyList);
        SoilParameters soilParams = calculateSoilParameters(combinedData.time, hourlyByDate);

        return buildDaily(combinedData, soilParams);
    }

    private CombinedDailyData combineDailyData(List<Daily> dailyList) {
        CombinedDailyData data = new CombinedDailyData();

        for (Daily daily : dailyList) {
            if (daily != null) {
                combineLists(data.time, daily.time());
                combineLists(data.temperatureMax, daily.temperatureMax());
                combineLists(data.temperatureMin, daily.temperatureMin());
                combineLists(data.precipitationSum, daily.precipitationSum());
                combineLists(data.referenceEvapotranspiration, daily.referenceEvapotranspiration());
                combineLists(data.temperatureMean, daily.temperatureMean());
                combineLists(data.relativeHumidityMean, daily.relativeHumidityMean());
                combineLists(data.relativeHumidityMin, daily.relativeHumidityMin());
                combineLists(data.windSpeedMax, daily.windSpeedMax());
                combineLists(data.windGustsMax, daily.windGustsMax());
                combineLists(data.shortwaveRadiationSum, daily.shortwaveRadiationSum());
                combineLists(data.sunshineDuration, daily.sunshineDuration());
            }
        }

        return data;
    }

    private Map<String, HourlyDataForDate> groupHourlyDataByDate(List<Hourly> hourlyList) {
        Map<String, HourlyDataForDate> result = new HashMap<>();

        for (Hourly hourly : hourlyList) {
            if (hourly == null || hourly.time() == null) continue;


            IntStream.range(0, hourly.time().size()).forEach(i -> {
                String hourlyTime = hourly.time().get(i);
                String date = hourlyTime.substring(0, 10);

                result.computeIfAbsent(date, k -> new HourlyDataForDate());
                HourlyDataForDate dateData = result.get(date);

                addIfPresent(dateData.temp0cm, hourly.soilTemperature0cm(), i);
                addIfPresent(dateData.temp6cm, hourly.soilTemperature6cm(), i);
                addIfPresent(dateData.moisture, hourly.soilMoisture0To1Cm(), i);
            });
        }
        result.forEach((date, data) -> {
            logger.info("Date {}: temp0cm count={}, temp6cm count={}, moisture count={}",
                    date, data.temp0cm.size(), data.temp6cm.size(), data.moisture.size());
        });

        return result;
    }

    private void addIfPresent(List<Double> target, List<Double> source, int index) {
        if (source != null && index < source.size()) {
            target.add(source.get(index));
        }
    }

    private SoilParameters calculateSoilParameters(List<String> dates, Map<String, HourlyDataForDate> hourlyByDate) {
        SoilParameters params = new SoilParameters();

        for (String date : dates) {
            HourlyDataForDate hourlyData = hourlyByDate.getOrDefault(date, new HourlyDataForDate());

            double avgTemp0cm = calculateAverage(hourlyData.temp0cm);
            double avgTemp6cm = calculateAverage(hourlyData.temp6cm);
            double avgMoisture = calculateAverage(hourlyData.moisture);

            params.temperature0cm.add(avgTemp0cm);
            params.temperature6cm.add(avgTemp6cm);
            params.moisture.add(avgMoisture);

            logger.info("Soil params for {}: temp0cm={}, temp6cm={}, moisture={}",
                    date, avgTemp0cm, avgTemp6cm, avgMoisture);
        }

        return params;
    }

    private Daily buildDaily(CombinedDailyData data, SoilParameters soil) {
        return new Daily(
                data.time,
                data.temperatureMax,
                data.temperatureMin,
                data.temperatureMean,
                data.relativeHumidityMean,
                data.relativeHumidityMin,
                data.precipitationSum,
                data.referenceEvapotranspiration,
                data.windSpeedMax,
                data.windGustsMax,
                data.shortwaveRadiationSum,
                data.sunshineDuration,
                soil.temperature0cm,
                soil.temperature6cm,
                soil.moisture
        );
    }


    private double calculateAverage(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        return values.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }

    private <T> void combineLists(List<T> target, List<T> source) {
        if (source != null) {
            target.addAll(source);
        }
    }

    class CombinedDailyData {
        List<String> time = new ArrayList<>();
        List<Double> temperatureMax = new ArrayList<>();
        List<Double> temperatureMin = new ArrayList<>();
        List<Double> precipitationSum = new ArrayList<>();
        List<Double> referenceEvapotranspiration = new ArrayList<>();
        List<Double> temperatureMean = new ArrayList<>();
        List<Double> relativeHumidityMean = new ArrayList<>();
        List<Double> relativeHumidityMin = new ArrayList<>();
        List<Double> windSpeedMax = new ArrayList<>();
        List<Double> windGustsMax = new ArrayList<>();
        List<Double> shortwaveRadiationSum = new ArrayList<>();
        List<Integer> sunshineDuration = new ArrayList<>();
    }

    class HourlyDataForDate {
        List<Double> temp0cm = new ArrayList<>();
        List<Double> temp6cm = new ArrayList<>();
        List<Double> moisture = new ArrayList<>();
    }

    class SoilParameters {
        List<Double> temperature0cm = new ArrayList<>();
        List<Double> temperature6cm = new ArrayList<>();
        List<Double> moisture = new ArrayList<>();
    }
}
