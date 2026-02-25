package com.omstu.agriculturefield.crop.repository;

import com.omstu.agriculturefield.crop.model.CropType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CropTypeRepository extends JpaRepository<CropType, Long> {

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);
}
