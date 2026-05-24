package com.omstu.agriculturefield.report.controller;

import com.omstu.agriculturefield.report.dto.FieldReportResponse;
import com.omstu.agriculturefield.report.service.FieldReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
public class FieldReportController {

    private final FieldReportService fieldReportService;

    @GetMapping("/field")
    public FieldReportResponse getFieldReport(
            @RequestParam Long fieldId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) Long cropHistoryId,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId
    ) {
        log.info("Field report requested: fieldId={}, farmId={}, dateFrom={}, dateTo={}", fieldId, farmId, dateFrom, dateTo);
        return fieldReportService.getFieldReport(fieldId, farmId, dateFrom, dateTo, cropHistoryId);
    }
}
