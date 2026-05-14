package com.omstu.agriculturefield.disease.repository;

import com.omstu.agriculturefield.disease.model.DiseaseRiskRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DiseaseRiskRuleRepository extends JpaRepository<DiseaseRiskRule, Long> {

    List<DiseaseRiskRule> findByIsActiveTrue();

    // affectedCrops хранит культуры через запятую — ищем через LIKE
    @Query("SELECT r FROM DiseaseRiskRule r WHERE r.isActive = true " +
            "AND LOWER(r.affectedCrops) LIKE LOWER(CONCAT('%', :cropName, '%'))")
    List<DiseaseRiskRule> findActiveRulesByCrop(@Param("cropName") String cropName);
}

