package com.omstu.agriculturefield.crop.repository;

import com.omstu.agriculturefield.crop.model.FertilizerApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FertilizerApplicationRepository extends JpaRepository<FertilizerApplication, Long> {

    List<FertilizerApplication> findByCropHistoryIdOrderByApplicationDateAsc(Long cropHistoryId);
}
