package com.omstu.agriculturefield.crop.repository;

import com.omstu.agriculturefield.crop.model.PhenologicalObservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhenologicalObservationRepository extends JpaRepository<PhenologicalObservation, Long> {

    List<PhenologicalObservation> findByCropHistoryIdOrderByObservationDateAsc(Long cropHistoryId);
}
