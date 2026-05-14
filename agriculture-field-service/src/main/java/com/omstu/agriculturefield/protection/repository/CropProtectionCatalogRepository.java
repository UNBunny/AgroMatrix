package com.omstu.agriculturefield.protection.repository;

import com.omstu.agriculturefield.protection.model.CropProtectionCatalogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CropProtectionCatalogRepository extends JpaRepository<CropProtectionCatalogEntry, Long> {

    @Query("SELECT e FROM CropProtectionCatalogEntry e WHERE e.cropCode = :cropCode AND e.isActive = true")
    List<CropProtectionCatalogEntry> findActiveByCropCode(@Param("cropCode") String cropCode);

    @Query("""
            SELECT e FROM CropProtectionCatalogEntry e
            WHERE e.cropCode = :cropCode
              AND e.diseaseName IN :diseaseNames
              AND e.isActive = true
            """)
    List<CropProtectionCatalogEntry> findActiveByCropCodeAndDiseaseNames(
            @Param("cropCode") String cropCode,
            @Param("diseaseNames") List<String> diseaseNames);
}
