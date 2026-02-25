package com.omstu.agriculturefield.disease.repository;

import com.omstu.agriculturefield.disease.model.DiseaseResistance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiseaseResistanceRepository extends JpaRepository<DiseaseResistance, Long> {

    @Modifying
    @Query("DELETE FROM DiseaseResistance dr WHERE dr.cropVariety.cropType.id = :cropTypeId")
    void deleteByCropTypeId(@Param("cropTypeId") Long cropTypeId);

    boolean existsByDiseaseIdAndCropVarietyId(Long diseaseId, Long cropVarietyId);
}
