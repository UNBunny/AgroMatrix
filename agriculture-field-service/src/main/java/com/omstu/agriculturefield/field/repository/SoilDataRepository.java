package com.omstu.agriculturefield.field.repository;

import com.omstu.agriculturefield.field.model.SoilData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SoilDataRepository extends JpaRepository<SoilData, Long> {

    Optional<SoilData> findByFieldId(Long fieldId);

    boolean existsByFieldId(Long fieldId);
}
