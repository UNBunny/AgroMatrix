package com.omstu.weatherservice.service.impl;

import com.omstu.weatherservice.dto.AgrometricalData;
import com.omstu.weatherservice.dto.OpenMeteoResponse;
import com.omstu.weatherservice.dto.SeasonalAgrometricsResponse;
import com.omstu.weatherservice.dto.WeatherRequestType;
import com.omstu.weatherservice.service.AgroMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AgrometricalDataServiceImpl implements AgroMetricsService {

    private final OpenMeteoService openMeteoService;

    private static final double ACTIVE_TEMP_THRESHOLD = 10.0;
    private static final double HEAT_STRESS_THRESHOLD = 30.0;
    private static final double EXTREME_HEAT_THRESHOLD = 35.0;
    private static final double GTK_MULTIPLIER = 10.0;
    private static final double DRY_DAY_THRESHOLD = 1.0;

    @Override
    public Mono<AgrometricalData> calculateHistoricalMetrics(
            Double lat, Double lon, String startDate, String endDate
    ) {
        log.info("Calculating historical agro metrics for period {} to {} at location: lat={}, lon={}",
                startDate, endDate, lat, lon);

        return openMeteoService.getWeather(lat, lon, WeatherRequestType.HISTORIC, null, startDate, endDate)
                .map(this::calculateMetricsFromResponse)
                .doOnSuccess(metrics -> log.info("Historical metrics calculated: GTK={}", metrics.gtk()))
                .doOnError(e -> log.error("Failed to calculate historical metrics: {}", e.getMessage()));
    }

    @Override
    public Mono<AgrometricalData> calculateForecastMetrics(Double lat, Double lon, Integer days) {
        log.info("Calculating forecast agro metrics for {} days at location: lat={}, lon={}", days, lat, lon);

        return openMeteoService.getWeather(lat, lon, WeatherRequestType.FORECAST, days, null, null)
                .map(this::calculateMetricsFromResponse)
                .doOnSuccess(metrics -> log.info("Forecast metrics calculated: GTK={}", metrics.gtk()))
                .doOnError(e -> log.error("Failed to calculate forecast metrics: {}", e.getMessage()));
    }

    @Override
    public AgrometricalData calculateMetricsFromResponse(OpenMeteoResponse response) {
        if (response.daily() == null) {
            return createEmptyMetrics();
        }

        List<Double> temperatures = response.daily().temperatureMax();
        List<Double> precipitations = response.daily().precipitationSum();
        List<Double> tempMean = response.daily().temperatureMean();
        List<Double> humidity = response.daily().relativeHumidityMean();

        if (temperatures == null || temperatures.isEmpty()) {
            return createEmptyMetrics();
        }

        return computeMetrics(temperatures, precipitations, tempMean, humidity);
    }

    private boolean isPeriodCovered(OpenMeteoResponse response, LocalDate from, LocalDate to) {
        if (response.daily() == null || response.daily().time() == null) return false;
        return response.daily().time().stream()
                .map(LocalDate::parse)
                .anyMatch(d -> !d.isBefore(from) && !d.isAfter(to));
    }

    private AgrometricalData computeMetricsForPeriod(
            OpenMeteoResponse response, LocalDate from, LocalDate to
    ) {
        if (response.daily() == null || response.daily().time() == null) {
            return createEmptyMetrics();
        }

        List<String> times = response.daily().time();
        List<Double> tempMax = response.daily().temperatureMax();
        List<Double> precip = response.daily().precipitationSum();
        List<Double> tempMean = response.daily().temperatureMean();

        List<Double> humidity = response.daily().relativeHumidityMean();
        List<Double> filteredTemp = new ArrayList<>();
        List<Double> filteredPrecip = new ArrayList<>();
        List<Double> filteredMean = new ArrayList<>();
        List<Double> filteredHumidity = new ArrayList<>();

        for (int i = 0; i < times.size(); i++) {
            LocalDate date = LocalDate.parse(times.get(i));
            if (!date.isBefore(from) && !date.isAfter(to)) {
                filteredTemp.add(tempMax != null && i < tempMax.size() ? tempMax.get(i) : null);
                filteredPrecip.add(precip != null && i < precip.size() ? precip.get(i) : null);
                filteredMean.add(tempMean != null && i < tempMean.size() ? tempMean.get(i) : null);
                filteredHumidity.add(humidity != null && i < humidity.size() ? humidity.get(i) : null);
            }
        }

        return computeMetrics(filteredTemp, filteredPrecip, filteredMean, filteredHumidity);
    }

    private AgrometricalData computeMetrics(
            List<Double> temperatures, List<Double> precipitations, List<Double> tempMean,
            List<Double> humidityList
    ) {
        double sumEffectiveTemp = 0.0;
        double sumPrecipitation = 0.0;
        double sumAllPrecip = 0.0;
        int heatStressDays = 0;
        int extremeHeatDays = 0;
        double minTemp = Double.MAX_VALUE;
        double sumMeanTemp = 0.0;
        int meanTempCount = 0;
        double sumHumidity = 0.0;
        int humidityCount = 0;

        int currentDryStreak = 0;
        int longestDryPeriod = 0;

        for (int i = 0; i < temperatures.size(); i++) {
            Double tempVal = temperatures.get(i);
            if (tempVal == null) continue;
            double temp = tempVal;

            double rain = (precipitations != null && i < precipitations.size() && precipitations.get(i) != null)
                    ? precipitations.get(i) : 0.0;

            sumAllPrecip += rain;

            if (temp < minTemp) minTemp = temp;
            if (temp > HEAT_STRESS_THRESHOLD) heatStressDays++;
            if (temp > EXTREME_HEAT_THRESHOLD) extremeHeatDays++;

            if (temp > ACTIVE_TEMP_THRESHOLD) {
                sumEffectiveTemp += temp;
                sumPrecipitation += rain;
            }

            if (tempMean != null && i < tempMean.size() && tempMean.get(i) != null) {
                sumMeanTemp += tempMean.get(i);
                meanTempCount++;
            }

            if (humidityList != null && i < humidityList.size() && humidityList.get(i) != null) {
                sumHumidity += humidityList.get(i);
                humidityCount++;
            }

            if (rain < DRY_DAY_THRESHOLD) {
                currentDryStreak++;
                if (currentDryStreak > longestDryPeriod) longestDryPeriod = currentDryStreak;
            } else {
                currentDryStreak = 0;
            }
        }

        double gtk = calculateGtk(sumPrecipitation, sumEffectiveTemp);
        String stressLevel = interpretGtk(gtk);
        double avgTemp = meanTempCount > 0 ? sumMeanTemp / meanTempCount : 0.0;
        Double avgHumidity = humidityCount > 0 ? sumHumidity / humidityCount : null;
        if (minTemp == Double.MAX_VALUE) minTemp = 0.0;

        return new AgrometricalData(
                gtk, sumAllPrecip, sumEffectiveTemp,
                heatStressDays, minTemp, stressLevel,
                avgTemp, extremeHeatDays, longestDryPeriod, avgHumidity
        );
    }

    private double calculateGtk(double sumPrecipitation, double sumEffectiveTemp) {
        if (sumEffectiveTemp <= 0) return 0.0;
        return (sumPrecipitation * GTK_MULTIPLIER) / sumEffectiveTemp;
    }

     @Override
    public Mono<AgrometricalData> calculateAveragedMetrics(
            Double lat, Double lon, String cropStartDate, Integer durationDays, Integer yearsCount) {

        log.info("Calculating averaged metrics: lat={}, lon={}, cropStart={}, duration={} days, years={}",
                lat, lon, cropStartDate, durationDays, yearsCount);

        if (yearsCount < 1 || yearsCount > 5) {
            log.error("Invalid years count: {}. Must be between 1 and 5", yearsCount);
            return Mono.error(new IllegalArgumentException("Years count must be between 1 and 5"));
        }

        String[] parts = cropStartDate.split("-");
        if (parts.length != 2) {
            log.error("Invalid crop start date format: {}. Expected MM-dd", cropStartDate);
            return Mono.error(new IllegalArgumentException("Invalid crop start date format. Expected MM-dd"));
        }

        try {
            int month = Integer.parseInt(parts[0]);
            int day = Integer.parseInt(parts[1]);
            int currentYear = java.time.LocalDate.now().getYear();

            return reactor.core.publisher.Flux.range(0, yearsCount)
                    .flatMap(offset -> {
                        int referenceYear = currentYear - 1 - offset;
                        java.time.LocalDate startDate = java.time.LocalDate.of(referenceYear, month, day);
                        java.time.LocalDate endDate = startDate.plusDays(durationDays);

                        log.debug("Fetching data for year {} (period: {} to {})",
                                referenceYear, startDate, endDate);

                        return calculateHistoricalMetrics(
                                lat, lon, startDate.toString(), endDate.toString())
                                .onErrorResume(e -> {
                                    log.warn("Failed to fetch data for year {}: {}",
                                            referenceYear, e.getMessage());
                                    return Mono.empty();
                                });
                    })
                    .collectList()
                    .map(metricsList -> {
                        if (metricsList.isEmpty()) {
                            log.error("No data retrieved for any year");
                            throw new RuntimeException("No historical data available");
                        }

                        double avgGtk = metricsList.stream()
                                .mapToDouble(AgrometricalData::gtk)
                                .average().orElse(0.0);

                        double avgPrecipitation = metricsList.stream()
                                .mapToDouble(AgrometricalData::sumPrecipitation)
                                .average().orElse(0.0);

                        double avgEffectiveTemp = metricsList.stream()
                                .mapToDouble(AgrometricalData::sumEffectiveTemp)
                                .average().orElse(0.0);

                        int avgHeatStressDays = (int) metricsList.stream()
                                .mapToInt(AgrometricalData::heatStressDays)
                                .average().orElse(0.0);

                        double avgMinTemp = metricsList.stream()
                                .mapToDouble(AgrometricalData::minTempRecord)
                                .average().orElse(0.0);

                        String stressLevel = interpretGtk(avgGtk)
                                + " (среднее за " + metricsList.size() + " лет)";

                        log.info("Calculated average metrics over {} years: GTK={}, stress={}",
                                metricsList.size(), avgGtk, stressLevel);

                        return new AgrometricalData(
                                avgGtk,
                                avgPrecipitation,
                                avgEffectiveTemp,
                                avgHeatStressDays,
                                avgMinTemp,
                                stressLevel,
                                0.0,
                                0,
                                0,
                                null
                        );
                    })
                    .doOnError(e -> log.error("Failed to calculate averaged metrics: {}", e.getMessage()));

        } catch (NumberFormatException e) {
            log.error("Invalid date format: {}", cropStartDate);
            return Mono.error(new IllegalArgumentException("Invalid date format in crop_start"));
        }
    }

    @Override
    public String interpretGtk(double gtk) {
        if (gtk == 0.0) return "Нет данных (T < 10°C)";
        if (gtk < 0.6) return "Очень сильная засуха";
        if (gtk < 1.0) return "Засушливо";
        if (gtk < 1.3) return "Оптимальное увлажнение";
        if (gtk < 1.6) return "Избыточное увлажнение";
        return "Переувлажнение / Риск гниения";
    }

    private AgrometricalData createEmptyMetrics() {
        return new AgrometricalData(0.0, 0.0, 0.0, 0, 0.0, "Нет данных", 0.0, 0, 0, null);
    }

    @Override
    @Cacheable(
            cacheNames = "seasonalMetrics",
            // Кэш только для ПРОШЕДШИХ лет — там данные неизменны (TTL 30 дн).
            // Для текущего года данные ежедневно дополняются Open-Meteo → не кэшируем здесь,
            // но внутренний вызов getWeather всё равно кэшируется на 1 ч в "weatherApi".
            key = "T(java.lang.Math).round(#lat * 100) / 100.0 + ',' " +
                    "+ T(java.lang.Math).round(#lon * 100) / 100.0 + ':' + #year",
            condition = "#year != null && #year < T(java.time.Year).now().getValue()"
    )
    public Mono<SeasonalAgrometricsResponse> calculateSeasonalMetrics(
            Double lat, Double lon, Integer year) {

        log.info("Calculating seasonal metrics for year {} at location: lat={}, lon={}", year, lat, lon);

        if (year < 1991 || year > java.time.LocalDate.now().getYear()) {
            return Mono.error(new IllegalArgumentException(
                    "Year must be between 1991 and current year (archive-api.open-meteo.com uses ERA5, available from 1940; 1991 is the WMO standard climate period start)"));
        }

        String startDate = (year - 1) + "-10-01";
        LocalDate seasonEnd = LocalDate.of(year, 9, 30);
        LocalDate maxAllowed = LocalDate.now().minusDays(5);
        if (seasonEnd.isAfter(maxAllowed)) {
            seasonEnd = maxAllowed;
        }
        String endDate = seasonEnd.toString();

        if (LocalDate.parse(startDate).isAfter(seasonEnd)) {
            return Mono.error(new IllegalArgumentException(
                    "No historical data available yet for year " + year + " (season starts Oct " + (year-1) + ")"));
        }

        return openMeteoService.getWeather(lat, lon, WeatherRequestType.HISTORIC, null, startDate, endDate)
                .map(response -> {
                    LocalDate octStart  = LocalDate.of(year - 1, 10, 1);
                    LocalDate marEnd    = LocalDate.of(year, 3, 31);
                    LocalDate aprStart  = LocalDate.of(year, 4, 1);
                    LocalDate mayEnd    = LocalDate.of(year, 5, 31);
                    LocalDate junStart  = LocalDate.of(year, 6, 1);
                    LocalDate julEnd    = LocalDate.of(year, 7, 31);
                    LocalDate augStart  = LocalDate.of(year, 8, 1);
                    LocalDate sepEnd    = LocalDate.of(year, 9, 30);

                    AgrometricalData octMar = computeMetricsForPeriod(response, octStart, marEnd);
                    AgrometricalData aprMay = computeMetricsForPeriod(response, aprStart, mayEnd);
                    AgrometricalData junJul = computeMetricsForPeriod(response, junStart, julEnd);
                    AgrometricalData augSep = computeMetricsForPeriod(response, augStart, sepEnd);
                    AgrometricalData aprSep = computeMetricsForPeriod(response, aprStart, sepEnd);

                    log.info("Seasonal metrics assembled for year {}: GTK(Apr-Sep)={}, precip(Oct-Mar)={}mm",
                            year, aprSep.gtk(), octMar.sumPrecipitation());

                    boolean hasOctMar = isPeriodCovered(response, octStart, marEnd);
                    boolean hasAprMay = isPeriodCovered(response, aprStart, mayEnd);
                    boolean hasJunJul = isPeriodCovered(response, junStart, julEnd);
                    boolean hasAugSep = isPeriodCovered(response, augStart, sepEnd);
                    boolean hasAprSep = isPeriodCovered(response, aprStart, sepEnd);

                    return new SeasonalAgrometricsResponse(
                            year,
                            hasOctMar ? octMar.sumPrecipitation() : null,
                            hasOctMar ? octMar.minTempRecord() : null,
                            hasAprMay ? aprMay.sumPrecipitation() : null,
                            hasAprMay ? aprMay.sumEffectiveTemp() : null,
                            hasAprMay ? aprMay.minTempRecord() < 0 : null,
                            hasAprMay ? aprMay.gtk() : null,
                            hasJunJul ? junJul.sumPrecipitation() : null,
                            hasJunJul ? junJul.sumEffectiveTemp() : null,
                            hasJunJul ? junJul.heatStressDays() : null,
                            hasJunJul ? junJul.extremeHeatDays() : null,
                            hasJunJul ? junJul.avgTemp() : null,
                            hasJunJul ? junJul.gtk() : null,
                            hasAugSep ? augSep.sumPrecipitation() : null,
                            hasAugSep ? augSep.sumEffectiveTemp() : null,
                            hasAugSep ? augSep.heatStressDays() : null,
                            hasAugSep ? augSep.gtk() : null,
                            hasAprSep ? aprSep.gtk() : null,
                            hasAprSep ? aprSep.sumEffectiveTemp() : null,
                            hasAprSep ? aprSep.heatStressDays() : null,
                            hasAprSep ? aprSep.minTempRecord() : null,
                            hasAprSep ? aprSep.longestDryPeriod() : null
                    );
                })
                .doOnSuccess(result -> log.info("Seasonal metrics calculated successfully for year {}", year))
                .doOnError(e -> log.error("Failed to calculate seasonal metrics: {}", e.getMessage()));
    }
}
