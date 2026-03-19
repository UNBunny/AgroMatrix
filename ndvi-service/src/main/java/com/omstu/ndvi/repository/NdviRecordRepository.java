package com.omstu.ndvi.repository;

import com.omstu.ndvi.model.NdviRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface NdviRecordRepository extends JpaRepository<NdviRecord, Long> {

    List<NdviRecord> findByFieldIdOrderByRecordDateDesc(Long fieldId);

    List<NdviRecord> findByFieldIdAndRecordDateBetweenOrderByRecordDateAsc(
            Long fieldId, LocalDate from, LocalDate to);

    Optional<NdviRecord> findTopByFieldIdOrderByRecordDateDesc(Long fieldId);

    Optional<NdviRecord> findByFieldIdAndRecordDate(Long fieldId, LocalDate recordDate);

    @Query("SELECT n FROM NdviRecord n WHERE n.fieldId = :fieldId AND YEAR(n.recordDate) = :year ORDER BY n.recordDate ASC")
    List<NdviRecord> findByFieldIdAndYear(@Param("fieldId") Long fieldId, @Param("year") int year);
}
