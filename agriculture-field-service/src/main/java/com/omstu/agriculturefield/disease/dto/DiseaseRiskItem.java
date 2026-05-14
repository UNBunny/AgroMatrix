package com.omstu.agriculturefield.disease.dto;

import com.omstu.agriculturefield.disease.model.enums.RiskLevel;

import java.util.List;

public record DiseaseRiskItem(
        Long ruleId,
        String diseaseName,
        String diseaseType,
        RiskLevel riskLevel,
        Double riskScore,
        String ruleDescription,
        List<String> triggeredConditions,
        String preventionAdvice,
        String treatmentAdvice,
        Integer urgencyDays
) {}
