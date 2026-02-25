package com.omstu.agriculturefield.crop.model;

import com.omstu.agriculturefield.crop.model.enums.PlantingStatus;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Date;

@Entity
@Table(name = "crop_history")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class CropHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne
    private AgriculturalField field;

    @ManyToOne
    private CropType cropType; // wheat, corn, barley

    @ManyToOne
    private CropVariety cropVariety;

    private Date plantingDate;

    private Date actualHarvestDate;

    private Date expectedHarvestDate;

    private BigDecimal seedAmountKgPerHa; // Обязательно для истории заполняет агроном

    private BigDecimal seedDepthCm; // Агроном может пропустить это поле если не помнит

    private BigDecimal plantSpacingCm;

    private BigDecimal actualYieldKg;

    private BigDecimal expectedYieldKg;

    @Enumerated(EnumType.STRING)
    private PlantingStatus plantingStatus; // Planned, Planted, Growing, Harvested

    private String notes; // Агроном пусть заполняет то что ему необходимо какие-то пометки

    private String weatherConditions; // 6.12 оставлю, но потом нужно пофиксить т.к погода дергается из апи
}
