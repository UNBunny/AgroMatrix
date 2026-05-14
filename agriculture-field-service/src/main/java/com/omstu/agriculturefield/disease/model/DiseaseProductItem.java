package com.omstu.agriculturefield.disease.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "disease_product_items")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiseaseProductItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recommendation_id", nullable = false)
    private DiseaseProductRecommendation recommendation;

    @Column(nullable = false)
    private Integer sortOrder;

    @Column(nullable = false)
    private String name;

    @Column(length = 500)
    private String activeIngredient;

    // класс FRAC/IRAC
    @Column(length = 255)
    private String mechanism;

    // норма расхода строкой, например "0.6 л/га"
    @Column(length = 100)
    private String dose;

    // числовое значение дозы для предзаполнения формы
    private Double doseValue;

    // BBCH-стадии, описание окна применения
    @Column(length = 500)
    private String timing;

    // 0 = нет ограничений по сроку ожидания
    @Column(nullable = false)
    @Builder.Default
    private Integer phiDays = 0;
}
