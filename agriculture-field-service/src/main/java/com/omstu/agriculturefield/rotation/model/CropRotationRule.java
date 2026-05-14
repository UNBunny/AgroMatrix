package com.omstu.agriculturefield.rotation.model;

import com.omstu.agriculturefield.crop.model.CropType;
import com.omstu.agriculturefield.rotation.model.enums.RotationRecommendation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "crop_rotation_rules")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CropRotationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "predecessor_crop_id", nullable = false)
    private CropType predecessorCrop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "successor_crop_id", nullable = false)
    private CropType successorCrop;

    private Boolean allowed;

    private Integer minGapYears;

    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation")
    private RotationRecommendation recommendation;

    @Column(name = "disease_risk", length = 300)
    private String diseaseRisk;

    @Column(name = "weed_risk", length = 300)
    private String weedRisk;

    @Column(name = "soil_structure_impact", length = 300)
    private String soilStructureImpact;

    @Column(name = "nitrogen_balance", length = 300)
    private String nitrogenBalance;

    @Column(name = "required_practices", length = 500)
    private String requiredPractices;
}