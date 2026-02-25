package com.omstu.agriculturefield.crop.model;

import com.omstu.agriculturefield.crop.model.enums.ToleranceLevel;
import com.omstu.agriculturefield.disease.model.DiseaseResistance;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.util.Set;

@Entity
@Table(name = "crop_varieties")
@Getter
@Setter
@NoArgsConstructor
@ToString(exclude = "diseaseResistance")
public class CropVariety {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @ManyToOne
    @JoinColumn(name = "crop_type_id")
    private CropType cropType;

    private String seedProducer; // Производитель семян

    private Integer maturationDays; // Среднее количество дней до созревания

    @OneToMany(
            mappedBy = "cropVariety",
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    private Set<DiseaseResistance> diseaseResistance; // Устойчивость к заболеваниям (уже рассчитана заранее)

    @Enumerated(EnumType.STRING)
    private ToleranceLevel droughtTolerance; // Устойчивость к засухе

    @Enumerated(EnumType.STRING)
    private ToleranceLevel frostTolerance; // Устойчивость к заморозкам

    private BigDecimal recommendedSeedingRateKgPerHa; // Рекомендуемая норма высева

    private BigDecimal seedCostPerKg; // Стоимость семян за кг

    private Boolean isHybrid = false;

    private String notes; // Характеристики/особенности, заметки либо описание от агронома

    private String origin; // Происхождение/страна/организация-оригинатор

    private String recommendedRegions; // Реестровые регионы допуска

    private Boolean isTopByArea; // Входит ли в топ по объёму высева (Россельхозцентр)
}
