package com.omstu.agriculturefield.crop.model;

import com.omstu.agriculturefield.crop.model.enums.ApplicationMethod;
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
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fertilizer_applications")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class FertilizerApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "crop_history_id", nullable = false)
    private CropHistory cropHistory;

    @Column(name = "application_date", nullable = false)
    private LocalDate applicationDate;

    @Column(name = "fertilizer_type", nullable = false, length = 100)
    private String fertilizerType;

    @Column(name = "formulation", length = 50)
    private String formulation;

    @Column(name = "dose_kg_per_ha")
    private Double doseKgPerHa;

    @Column(name = "total_area_ha")
    private Double totalAreaHa;

    @Column(name = "total_amount_kg")
    private Double totalAmountKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "application_method")
    private ApplicationMethod applicationMethod;

    @Column(name = "bbch_phase")
    private Integer bbchPhase;

    @Column(name = "cost_per_ha", precision = 12, scale = 2)
    private BigDecimal costPerHa;

    @Column(name = "total_cost", precision = 14, scale = 2)
    private BigDecimal totalCost;

    @Column(name = "weather_temp_c")
    private Double weatherTempC;

    @Column(name = "weather_humidity")
    private Integer weatherHumidity;

    @Column(name = "wind_speed")
    private Double windSpeed;

    @Column(name = "notes", length = 500)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
