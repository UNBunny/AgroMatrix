package com.omstu.agriculturefield.disease.model;

import com.omstu.agriculturefield.disease.model.enums.DiseaseType;
import com.omstu.agriculturefield.disease.model.enums.RiskLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "disease_risk_rules")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiseaseRiskRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;


    @Column(nullable = false)
    private String diseaseName;


    @Enumerated(EnumType.STRING)
    private DiseaseType diseaseType;

    @Column(nullable = false)
    private String affectedCrops;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RiskLevel riskLevel;

    @Column(nullable = false)
    private Double riskWeight;

    // === Условия по температуре ===

    private Double tempMinThreshold;

    private Double tempMaxThreshold;

    // === Условия по осадкам ===

    private Double precipMin7d;

    // null = не проверять
    private Double precipMax7d;

    // === Условия по влажности ===

    private Double humidityMinThreshold;

    // === Условия по ГТК ===

    private Double gtkMin;

    private Double gtkMax;

    // === Условия по теплу ===

    private Integer heatStressDaysMin;

    // === Условия по засухе ===

    private Integer dryPeriodDaysMin;

    // месяцы через запятую, например: "5,6,7,8"
    private String activeSeason;

    @Column(length = 500)
    private String ruleDescription;

    @Column(length = 1000)
    private String preventionAdvice;

    @Column(length = 1000)
    private String treatmentAdvice;

    // через сколько дней нужно принять меры
    private Integer urgencyDays;

    @Column(nullable = false)
    private Boolean isActive = true;
}

