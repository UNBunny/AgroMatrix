package com.omstu.agriculturefield.crop.repository;

import com.omstu.agriculturefield.crop.model.CropHistory;
import com.omstu.agriculturefield.crop.model.enums.PlantingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CropHistoryRepository extends JpaRepository<CropHistory, Long> {

    @Query("SELECT h FROM CropHistory h WHERE h.field.id = :fieldId ORDER BY h.plantingDate DESC")
    List<CropHistory> findByFieldIdOrderByPlantingDateDesc(@Param("fieldId") Long fieldId);

    @Modifying
    @Query("DELETE FROM CropHistory h WHERE h.field.id = :fieldId")
    void deleteByFieldId(@Param("fieldId") Long fieldId);

    @Modifying
    @Query("DELETE FROM CropHistory h WHERE h.cropType.id = :cropTypeId")
    void deleteByCropTypeId(@Param("cropTypeId") Long cropTypeId);

    @Query("SELECT COUNT(h) > 0 FROM CropHistory h WHERE h.field.id = :fieldId AND h.plantingStatus IN :activeStatuses AND EXTRACT(YEAR FROM h.plantingDate) = :year")
    boolean existsActivePlantingForFieldAndYear(@Param("fieldId") Long fieldId, @Param("year") int year, @Param("activeStatuses") List<PlantingStatus> activeStatuses);
}
