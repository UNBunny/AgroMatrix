package com.omstu.agriculturefield.disease.repository;

import com.omstu.agriculturefield.disease.model.Disease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiseaseRepository extends JpaRepository<Disease, Long> {

    boolean existsByScientificName(String scientificName);

    boolean existsByScientificNameAndIdNot(String scientificName, Long id);

    @Modifying
    @Query(value = "DELETE FROM disease_affected_crops WHERE crop_type_id = :cropTypeId", nativeQuery = true)
    void deleteAffectedCropsByCropTypeId(@Param("cropTypeId") Long cropTypeId);

    @Query("SELECT COUNT(dr) > 0 FROM DiseaseResistance dr WHERE dr.disease.id = :diseaseId")
    boolean hasDiseaseResistances(@Param("diseaseId") Long diseaseId);
}
