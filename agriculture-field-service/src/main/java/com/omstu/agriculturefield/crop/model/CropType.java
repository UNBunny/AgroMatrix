package com.omstu.agriculturefield.crop.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "crop_types")
@Data
public class CropType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String category; // Зерновые, Бобовые (пока больше не будет)

    private Integer growingSeasonDays; // Средняя продолжительность вегетации (дней)

    private BigDecimal optimalTemperatureMin; // Минимальная оптимальная температура

    private BigDecimal optimalTemperatureMax; // Максимальная оптимальная температура

    private BigDecimal waterRequirementsMm; // Требования к поливу (мм за сезон)

    private String notes; // Заметки агронома либо описание

    private String mlCropCode; // Код для ML-модели (spring_wheat, sunflower и т.д.)
}
