package com.omstu.agriculturefield.field.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Polygon;


@Entity
@Table(name = "agricultural_fields")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class AgriculturalField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    private String fieldName;

    @Column(name = "crop_type")
    private String cropType;

    private String status;

    @Column(columnDefinition = "Polygon, 4326")
    private Polygon geom;

    @Column(columnDefinition = "MultiPolygon, 4326")
    private MultiPolygon holes;

    @Column(name = "area_hectares", columnDefinition = "NUMERIC(12,2)")
    private Double areaHectares;

    private String regionCode; // Код региона для ML-модели (OMS, ALT и т.д.)

    private String regionName; // Полное название региона (Омская область и т.д.)
}
