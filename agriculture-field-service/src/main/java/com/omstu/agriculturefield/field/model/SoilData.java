package com.omstu.agriculturefield.field.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "soil_data")
@Data
public class SoilData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false, unique = true)
    private AgriculturalField field;

    @Column(name = "nitrogen_n", nullable = true)
    private Double nitrogenN; // Содержание азота в кг/га (SoilGrids: cgld/N)

    @Column(name = "phosphorus_p", nullable = true)
    private Double phosphorusP; // Фосфор в кг/га (SoilGrids: cph/P)

    @Column(name = "potassium_k", nullable = true)
    private Double potassiumK; // Калий в кг/га (SoilGrids: cpot/K)

    @Column(name = "ph_level", nullable = true)
    private Double phLevel; // pH воды (SoilGrids: phh2o)

    @Column(name = "organic_matter", nullable = true)
    private Double organicMatter; // Органическое вещество % (SoilGrids: soc)

    @Column(name = "soil_texture", nullable = true)
    private String soilTexture; // Класс текстуры почвы (глина, песчаный суглинок и т. д.)

    @Column(name = "cec", nullable = true)
    private Double cec; // Емкость катионного обмена cmol(+)/kg (SoilGrids: cec)

    @Column(name = "bulk_density", nullable = true)
    private Double bulkDensity; // Объемная плотность, г/см³ (SoilGrids: bld)

    @Column(name = "source", nullable = false)
    @Enumerated(EnumType.STRING)
    private SoilDataSource source = SoilDataSource.AUTO; // Автоматический (SoilGrids) или ручной

    @Column(name = "confidence", nullable = true)
    private Double confidence; // Уровень достоверности по данным SoilGrids (0-100)

    @Column(name = "soilgrids_version", nullable = true)
    private String soilgridsVersion; // Используемая версия данных SoilGrids

    @Column(name = "last_synced_at", nullable = true)
    private LocalDateTime lastSyncedAt; // Когда в последний раз были получены данные из SoilGrids

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "notes", length = 500)
    private String notes; // Заметки агронома о состоянии почвы

    public enum SoilDataSource {
        AUTO,      // Данные автоматически извлекаются из API SoilGrids
        MANUAL,    // Данные введены/отредактированы вручную агрономом
        MIXED      // Сочетание автоматически полученных и вручную скорректированных данных.
    }
}
