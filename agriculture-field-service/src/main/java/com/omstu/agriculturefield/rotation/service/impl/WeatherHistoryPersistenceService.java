package com.omstu.agriculturefield.rotation.service.impl;

import com.omstu.agriculturefield.rotation.dto.SeasonalWeatherDto;
import com.omstu.agriculturefield.rotation.model.WeatherHistoryEntry;
import com.omstu.agriculturefield.rotation.repository.WeatherHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeatherHistoryPersistenceService {

    private final WeatherHistoryRepository weatherHistoryRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void persist(double latR, double lonR, int year, SeasonalWeatherDto dto) {
        try {
            WeatherHistoryEntry entry = WeatherHistoryEntry.builder()
                    .latRounded(latR)
                    .lonRounded(lonR)
                    .year(year)
                    .fetchedAt(LocalDateTime.now())
                    .precipOctMar(dto.precipOctMar())
                    .minTempWinter(dto.minTempWinter())
                    .precipAprMay(dto.precipAprMay())
                    .tempSumAprMay(dto.tempSumAprMay())
                    .frostRiskSpring(dto.frostRiskSpring())
                    .gtkAprMay(dto.gtkAprMay())
                    .precipJunJul(dto.precipJunJul())
                    .tempSumJunJul(dto.tempSumJunJul())
                    .heatStressJunJul(dto.heatStressJunJul())
                    .extremeHeatJunJul(dto.extremeHeatJunJul())
                    .avgTempJunJul(dto.avgTempJunJul())
                    .gtkJunJul(dto.gtkJunJul())
                    .precipAugSep(dto.precipAugSep())
                    .tempSumAugSep(dto.tempSumAugSep())
                    .heatStressAugSep(dto.heatStressAugSep())
                    .gtkAugSep(dto.gtkAugSep())
                    .gtkAprSep(dto.gtkAprSep())
                    .tempSumAprSep(dto.tempSumAprSep())
                    .totalHeatStressDays(dto.totalHeatStressDays())
                    .minTempVegetation(dto.minTempVegetation())
                    .longestDryPeriod(dto.longestDryPeriod())
                    .build();
            weatherHistoryRepository.save(entry);
            log.debug("Persisted weather history for lat={}, lon={}, year={}", latR, lonR, year);
        } catch (Exception e) {
            log.warn("Failed to persist weather entry for year {}: {}", year, e.getMessage());
        }
    }
}
