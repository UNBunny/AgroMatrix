package com.omstu.agriculturefield.crop.repository;

import com.omstu.agriculturefield.crop.model.PlantProtectionOperation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlantProtectionRepository extends JpaRepository<PlantProtectionOperation, Long> {

    List<PlantProtectionOperation> findByCropHistoryIdOrderByOperationDateAsc(Long cropHistoryId);
}
