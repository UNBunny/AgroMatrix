package com.omstu.agriculturefield.rotation.repository;

import com.omstu.agriculturefield.rotation.model.CropRotationRule;
import com.omstu.agriculturefield.rotation.model.enums.RotationRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CropRotationRuleRepository extends JpaRepository<CropRotationRule, Long> {

    @Query("SELECT r FROM CropRotationRule r WHERE r.predecessorCrop.id = :predecessorCropId")
    List<CropRotationRule> findByPredecessorCropId(@Param("predecessorCropId") Long predecessorCropId);

    @Query("SELECT r FROM CropRotationRule r WHERE r.predecessorCrop.id = :predecessorCropId AND (r.allowed = true OR r.recommendation IN :recommended)")
    List<CropRotationRule> findAllowedByPredecessorCropId(
            @Param("predecessorCropId") Long predecessorCropId,
            @Param("recommended") List<RotationRecommendation> recommended);

    @Modifying
    @Query("DELETE FROM CropRotationRule r WHERE r.predecessorCrop.id = :cropTypeId OR r.successorCrop.id = :cropTypeId")
    void deleteByCropTypeId(@Param("cropTypeId") Long cropTypeId);

    boolean existsByPredecessorCropIdAndSuccessorCropId(Long predecessorCropId, Long successorCropId);
}