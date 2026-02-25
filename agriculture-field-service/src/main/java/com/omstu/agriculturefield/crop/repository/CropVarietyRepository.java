package com.omstu.agriculturefield.crop.repository;

import com.omstu.agriculturefield.crop.model.CropVariety;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CropVarietyRepository extends JpaRepository<CropVariety, Long> {

    List<CropVariety> findByCropTypeId(Long cropTypeId);

    boolean existsByNameAndCropTypeId(String name, Long cropTypeId);

    boolean existsByCropTypeId(Long cropTypeId);

    @Modifying
    @Query("DELETE FROM CropVariety v WHERE v.cropType.id = :cropTypeId")
    void deleteByCropTypeId(@Param("cropTypeId") Long cropTypeId);
}
