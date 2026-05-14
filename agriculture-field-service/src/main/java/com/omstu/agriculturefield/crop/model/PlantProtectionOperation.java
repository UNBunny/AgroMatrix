package com.omstu.agriculturefield.crop.model;

import com.omstu.agriculturefield.crop.model.enums.InfestationLevel;
import com.omstu.agriculturefield.crop.model.enums.ProtectionOperationType;
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
@Table(name = "plant_protection_operations")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PlantProtectionOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "crop_history_id", nullable = false)
    private CropHistory cropHistory;

    @Column(name = "operation_date", nullable = false)
    private LocalDate operationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false)
    private ProtectionOperationType operationType;

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Column(name = "active_ingredient", length = 200)
    private String activeIngredient;

    @Column(name = "mechanism_of_action", length = 200)
    private String mechanismOfAction;

    @Column(name = "dose_l_per_ha")
    private Double doseLPerHa;

    @Column(name = "concentration_percent")
    private Double concentrationPercent;

    @Column(name = "target_pest", length = 200)
    private String targetPest;

    @Enumerated(EnumType.STRING)
    @Column(name = "infestation_level")
    private InfestationLevel infestationLevel;

    @Column(name = "bbch_phase")
    private Integer bbchPhase;

    @Column(name = "temp_c")
    private Double tempC;

    @Column(name = "humidity")
    private Integer humidity;

    @Column(name = "wind_speed")
    private Double windSpeed;

    @Column(name = "precipitation_expected")
    private Boolean precipitationExpected;

    @Column(name = "efficacy_percent")
    private Integer efficacyPercent;

    @Column(name = "follow_up_required")
    private Boolean followUpRequired;

    @Column(name = "phi_days")
    private Integer phiDays;

    @Column(name = "harvest_allowed_after")
    private LocalDate harvestAllowedAfter;

    @Column(name = "cost_per_ha", precision = 12, scale = 2)
    private BigDecimal costPerHa;

    @Column(name = "notes", length = 500)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
