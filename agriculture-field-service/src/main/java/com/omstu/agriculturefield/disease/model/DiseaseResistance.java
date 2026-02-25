package com.omstu.agriculturefield.disease.model;

import com.omstu.agriculturefield.crop.model.CropVariety;
import com.omstu.agriculturefield.disease.model.enums.ResistanceLevel;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "disease_resistances")
@Getter
@Setter
@NoArgsConstructor
public class DiseaseResistance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Disease disease;

    @ManyToOne(fetch = FetchType.LAZY)
    private CropVariety cropVariety;

    @Enumerated(EnumType.STRING)
    private ResistanceLevel resistanceLevel;
}
