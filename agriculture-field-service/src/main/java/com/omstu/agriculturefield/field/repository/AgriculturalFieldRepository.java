package com.omstu.agriculturefield.field.repository;

import com.omstu.agriculturefield.field.model.AgriculturalField;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgriculturalFieldRepository extends JpaRepository<AgriculturalField, Long> {

    boolean existsByFieldName(String fieldName);

    boolean existsByFieldNameAndIdNot(String fieldName, Long id);

    boolean existsByFieldNameAndFarmId(String fieldName, Long farmId);

    boolean existsByFieldNameAndIdNotAndFarmId(String fieldName, Long id, Long farmId);

    java.util.List<AgriculturalField> findAllByFarmId(Long farmId);

    java.util.Optional<AgriculturalField> findByIdAndFarmId(Long id, Long farmId);
}
