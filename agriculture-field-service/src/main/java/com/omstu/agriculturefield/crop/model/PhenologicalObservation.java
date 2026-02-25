package com.omstu.agriculturefield.crop.model;

import com.omstu.agriculturefield.crop.model.enums.ObservationMethod;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "phenological_observations")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PhenologicalObservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "crop_history_id", nullable = false)
    private CropHistory cropHistory;

    @Column(name = "observation_date", nullable = false)
    private LocalDate observationDate;

    @Column(name = "bbch_scale", nullable = false)
    private Integer bbchScale;

    @Column(name = "bbch_description", length = 200)
    private String bbchDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "observation_method")
    private ObservationMethod observationMethod;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "weather_conditions", length = 200)
    private String weatherConditions;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
