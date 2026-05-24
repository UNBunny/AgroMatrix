package com.omstu.agriculturefield.report.repository;

import com.omstu.agriculturefield.report.model.AuditLogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLogEntry, Long> {

    @Query("""
        SELECT a FROM AuditLogEntry a
        WHERE (:entityType IS NULL OR a.entityType = :entityType)
          AND (:userId     IS NULL OR a.userId     = :userId)
          AND (:fieldId    IS NULL OR a.fieldId    = :fieldId)
          AND (:from       IS NULL OR a.createdAt >= :from)
          AND (:to         IS NULL OR a.createdAt <= :to)
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLogEntry> search(
            @Param("entityType") String entityType,
            @Param("userId")     Long userId,
            @Param("fieldId")    Long fieldId,
            @Param("from")       LocalDateTime from,
            @Param("to")         LocalDateTime to,
            Pageable pageable
    );
}
