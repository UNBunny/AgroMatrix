package com.omstu.agriculturefield.report.dto;

import java.time.LocalDateTime;

public record AuditLogEntryDto(
        Long id,
        String entityType,
        Long entityId,
        String action,
        Long userId,
        String username,
        Long fieldId,
        String fieldName,
        String changedField,
        String oldValue,
        String newValue,
        LocalDateTime createdAt
) {}
