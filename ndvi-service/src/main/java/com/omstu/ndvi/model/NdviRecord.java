package com.omstu.ndvi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ndvi_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NdviRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "field_id", nullable = false)
    private Long fieldId;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(name = "ndvi_mean", nullable = false)
    private Double ndviMean;

    @Column(name = "ndvi_min")
    private Double ndviMin;

    @Column(name = "ndvi_max")
    private Double ndviMax;

    @Column(name = "ndvi_std")
    private Double ndviStd;

    /**
     * Источник данных: GEE_SENTINEL2 или AGROMONITORING
     */
    @Column(name = "source", nullable = false)
    private String source;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
