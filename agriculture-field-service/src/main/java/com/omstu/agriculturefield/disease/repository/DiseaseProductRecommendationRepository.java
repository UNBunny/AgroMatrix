package com.omstu.agriculturefield.disease.repository;

import com.omstu.agriculturefield.disease.model.DiseaseProductRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DiseaseProductRecommendationRepository extends JpaRepository<DiseaseProductRecommendation, Long> {

    List<DiseaseProductRecommendation> findAllByIsActiveTrue();
}
