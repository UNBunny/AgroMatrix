package com.omstu.agriculturefield.rotation.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "weather_history_cache",
    uniqueConstraints = @UniqueConstraint(columnNames = {"lat_rounded", "lon_rounded", "year"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherHistoryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lat_rounded", nullable = false)
    private Double latRounded;

    @Column(name = "lon_rounded", nullable = false)
    private Double lonRounded;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "fetched_at", nullable = false)
    private LocalDateTime fetchedAt;

    // ── seasonal fields (mirrors SeasonalWeatherDto) ──────────────────────

    @Column(name = "precip_oct_mar")
    private Double precipOctMar;

    @Column(name = "min_temp_winter")
    private Double minTempWinter;

    @Column(name = "precip_apr_may")
    private Double precipAprMay;

    @Column(name = "temp_sum_apr_may")
    private Double tempSumAprMay;

    @Column(name = "frost_risk_spring")
    private Boolean frostRiskSpring;

    @Column(name = "gtk_apr_may")
    private Double gtkAprMay;

    @Column(name = "precip_jun_jul")
    private Double precipJunJul;

    @Column(name = "temp_sum_jun_jul")
    private Double tempSumJunJul;

    @Column(name = "heat_stress_jun_jul")
    private Integer heatStressJunJul;

    @Column(name = "extreme_heat_jun_jul")
    private Integer extremeHeatJunJul;

    @Column(name = "avg_temp_jun_jul")
    private Double avgTempJunJul;

    @Column(name = "gtk_jun_jul")
    private Double gtkJunJul;

    @Column(name = "precip_aug_sep")
    private Double precipAugSep;

    @Column(name = "temp_sum_aug_sep")
    private Double tempSumAugSep;

    @Column(name = "heat_stress_aug_sep")
    private Integer heatStressAugSep;

    @Column(name = "gtk_aug_sep")
    private Double gtkAugSep;

    @Column(name = "gtk_apr_sep")
    private Double gtkAprSep;

    @Column(name = "temp_sum_apr_sep")
    private Double tempSumAprSep;

    @Column(name = "total_heat_stress_days")
    private Integer totalHeatStressDays;

    @Column(name = "min_temp_vegetation")
    private Double minTempVegetation;

    @Column(name = "longest_dry_period")
    private Integer longestDryPeriod;
}
