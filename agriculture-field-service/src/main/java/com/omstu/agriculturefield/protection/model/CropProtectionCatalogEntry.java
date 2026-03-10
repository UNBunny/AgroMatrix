package com.omstu.agriculturefield.protection.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "crop_protection_catalog")
@Getter
@Setter
public class CropProtectionCatalogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "crop_code", nullable = false, length = 50)
    private String cropCode;

    @Column(name = "disease_name", nullable = false, length = 200)
    private String diseaseName;

    @Column(name = "pathogen_latin", length = 200)
    private String pathogenLatin;

    @Column(name = "disease_type", nullable = false, length = 20)
    private String diseaseType;

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Column(name = "frac_group", length = 100)
    private String fracGroup;

    @Column(name = "frac_code", length = 20)
    private String fracCode;

    @Column(name = "active_ingredients", nullable = false, length = 300)
    private String activeIngredients;

    @Column(name = "ai_concentration", length = 120)
    private String aiConcentration;

    @Column(name = "application_type", nullable = false, length = 20)
    private String applicationType;

    @Column(name = "bbch_from")
    private Integer bbchFrom;

    @Column(name = "bbch_to")
    private Integer bbchTo;

    @Column(name = "bbch_note", length = 120)
    private String bbchNote;

    @Column(name = "dose_rate", nullable = false, length = 60)
    private String doseRate;

    @Column(name = "dose_value")
    private Double doseValue;

    @Column(name = "dose_unit", length = 20)
    private String doseUnit;

    @Column(name = "temp_min_c")
    private Double tempMinC;

    @Column(name = "temp_opt_c")
    private Double tempOptC;

    @Column(name = "temp_max_c")
    private Double tempMaxC;

    @Column(name = "phi_days", nullable = false)
    private Integer phiDays;

    @Column(length = 500)
    private String notes;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
