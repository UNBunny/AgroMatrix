package com.omstu.agriculturefield.field.repository;

import com.omstu.agriculturefield.field.model.AgriculturalField;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgriculturalFieldRepository extends JpaRepository<AgriculturalField, Long> {

    boolean existsByFieldName(String fieldName);

    boolean existsByFieldNameAndIdNot(String fieldName, Long id);
}
