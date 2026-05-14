package com.omstu.agriculturefield.field.repository;

import com.omstu.agriculturefield.field.model.SoilHorizon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SoilHorizonRepository extends JpaRepository<SoilHorizon, Long> {

    List<SoilHorizon> findByFieldIdOrderByDepthFromCm(Long fieldId);

    boolean existsByFieldIdAndDepthFromCm(Long fieldId, Integer depthFromCm);
}
