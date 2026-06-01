package com.omstu.agriculturefield.report.service;

import com.omstu.agriculturefield.report.dto.AuditLogEntryDto;
import com.omstu.agriculturefield.report.model.AuditLogEntry;
import com.omstu.agriculturefield.report.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void log(
            String entityType,
            Long entityId,
            String action,
            Long userId,
            String username,
            Long fieldId,
            String fieldName,
            String changedField,
            String oldValue,
            String newValue
    ) {
        try {
            AuditLogEntry entry = AuditLogEntry.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .userId(userId)
                    .username(username)
                    .fieldId(fieldId)
                    .fieldName(fieldName)
                    .changedField(changedField)
                    .oldValue(oldValue)
                    .newValue(newValue)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to save audit log: entityType={}, entityId={}, action={}, error={}",
                    entityType, entityId, action, e.getMessage(), e);
        }
    }

    public Page<AuditLogEntryDto> search(
            String entityType,
            Long userId,
            Long fieldId,
            String dateFrom,
            String dateTo,
            int page,
            int size
    ) {
        LocalDateTime from = dateFrom != null ? LocalDate.parse(dateFrom).atStartOfDay() : null;
        LocalDateTime to   = dateTo   != null ? LocalDate.parse(dateTo).atTime(23, 59, 59) : null;

        return auditLogRepository.search(entityType, userId, fieldId, from, to, PageRequest.of(page, size))
                .map(e -> new AuditLogEntryDto(
                        e.getId(), e.getEntityType(), e.getEntityId(),
                        e.getAction(), e.getUserId(), e.getUsername(),
                        e.getFieldId(), e.getFieldName(),
                        e.getChangedField(), e.getOldValue(), e.getNewValue(),
                        e.getCreatedAt()
                ));
    }
}
