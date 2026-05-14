package com.omstu.agriculturefield.disease.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "disease_product_recommendations")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiseaseProductRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false, length = 500)
    private String keywords;

    // FUNGICIDE | INSECTICIDE | HERBICIDE
    @Column(nullable = false, length = 20)
    private String opType;

    // читаемое название для UI: "Фунгицид", "Инсектицид", "Гербицид"
    @Column(nullable = false, length = 50)
    private String opLabel;

    @Column(nullable = false, length = 20)
    private String opColor;

    @Column(nullable = false, length = 10)
    private String opEmoji;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @OneToMany(mappedBy = "recommendation", cascade = CascadeType.ALL,
               fetch = FetchType.EAGER, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<DiseaseProductItem> products = new ArrayList<>();
}
