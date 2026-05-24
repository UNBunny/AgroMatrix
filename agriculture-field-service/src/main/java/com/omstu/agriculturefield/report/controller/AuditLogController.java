package com.omstu.agriculturefield.report.controller;

import com.omstu.agriculturefield.report.dto.AuditLogEntryDto;
import com.omstu.agriculturefield.report.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@Slf4j
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public Page<AuditLogEntryDto> getAuditLog(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long fieldId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        log.info("Audit log query: entityType={}, userId={}, fieldId={}, dateFrom={}, dateTo={}", entityType, userId, fieldId, dateFrom, dateTo);
        return auditLogService.search(entityType, userId, fieldId, dateFrom, dateTo, page, Math.min(size, 100));
    }
}
