package com.omstu.agriculturefield.disease.dto;

import com.omstu.agriculturefield.disease.model.enums.RiskLevel;

import java.time.LocalDateTime;
import java.util.List;

public record DiseaseRiskResponse(
        // Основная информация
        Long fieldId,
        String fieldName,
        String cropName,
        
        // Общий риск
        RiskLevel overallRiskLevel,
        Double overallRiskScore,
        
        // Погодные данные
        Double avgTemp,
        Double sumPrecipitation,
        Double humidity,
        Integer heatStressDays,
        Integer longestDryPeriod,
        Double gtk,
        
        // Риск засухи
        RiskLevel droughtRisk,
        Double droughtScore,
        String droughtDescription,
        
        // Риск заморозков
        RiskLevel frostRisk,
        Double frostScore,
        String frostDescription,
        
        // Риск теплового стресса
        RiskLevel heatStressRisk,
        Double heatStressScore,
        String heatStressDescription,
        
        // Риски болезней
        List<DiseaseRiskItem> diseaseRisks,
        
        // Рекомендации
        List<String> recommendations,
        
        // Метаданные
        LocalDateTime assessmentTime,
        String dataSource  // "FORECAST" | "HISTORICAL" | "FALLBACK"
) {}
