package com.omstu.agriculturefield.report.repository;

import com.omstu.agriculturefield.report.model.SeasonPlan;
import com.omstu.agriculturefield.report.model.enums.PlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeasonPlanRepository extends JpaRepository<SeasonPlan, Long> {

    List<SeasonPlan> findAllByFarmIdOrderByCreatedAtDesc(Long farmId);

    List<SeasonPlan> findAllByFarmIdAndStatusOrderByCreatedAtDesc(Long farmId, PlanStatus status);

    List<SeasonPlan> findAllByFarmIdAndField_IdOrderByCreatedAtDesc(Long farmId, Long fieldId);
}
