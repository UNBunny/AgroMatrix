package com.omstu.agriculturefield.field.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "soil_horizons")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class SoilHorizon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    private AgriculturalField field;

    @Column(name = "depth_from_cm", nullable = false)
    private Integer depthFromCm;

    @Column(name = "depth_to_cm", nullable = false)
    private Integer depthToCm;

    @Column(name = "nitrogen_n")
    private Double nitrogenN;

    @Column(name = "phosphorus_p")
    private Double phosphorusP;

    @Column(name = "potassium_k")
    private Double potassiumK;

    @Column(name = "ph_level")
    private Double phLevel;

    @Column(name = "bulk_density")
    private Double bulkDensity;

    @Column(name = "organic_matter")
    private Double organicMatter;

    @Column(name = "sampling_date")
    private LocalDate samplingDate;

    @Column(name = "lab_protocol", length = 200)
    private String labProtocol;

    @Column(name = "notes", length = 500)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
