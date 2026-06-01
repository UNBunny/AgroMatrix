package com.omstu.agriculturefield.report.controller;

import com.omstu.agriculturefield.report.service.XlsExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@Tag(name = "XLS Export", description = "Экспорт данных в формат Excel (XLSX)")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class XlsExportController {

    private final XlsExportService xlsExportService;

    private static final MediaType XLSX_MEDIA_TYPE =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    @Operation(
        summary = "Экспорт истории посевов хозяйства",
        description = "Формирует XLSX-файл с историей посевов всех полей хозяйства. " +
                      "Столбцы: поле, культура, сорт, площадь га, дата посева, дата уборки, урожайность кг."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "XLSX-файл",
            content = @Content(mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
        @ApiResponse(responseCode = "404", description = "Хозяйство не найдено")
    })
    @GetMapping("/farms/{farmId}/sowing-history/export")
    public ResponseEntity<byte[]> exportFarmSowingHistory(
            @Parameter(description = "ID хозяйства") @PathVariable Long farmId) throws IOException {
        log.info("XLS export: farm sowing history farmId={}", farmId);
        byte[] bytes = xlsExportService.exportFarmCropHistory(farmId);
        return ResponseEntity.ok()
                .contentType(XLSX_MEDIA_TYPE)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"sowing-history-farm-" + farmId + ".xlsx\"")
                .body(bytes);
    }

    @Operation(
        summary = "Экспорт отчёта по полю",
        description = "Формирует XLSX-файл с двумя листами: «Сводка» (реквизиты поля) " +
                      "и «Детализация посевов» (история культур с датами и урожайностью)."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "XLSX-файл",
            content = @Content(mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
        @ApiResponse(responseCode = "404", description = "Поле не найдено")
    })
    @GetMapping("/fields/{fieldId}/report/export")
    public ResponseEntity<byte[]> exportFieldReport(
            @Parameter(description = "ID поля") @PathVariable Long fieldId) throws IOException {
        log.info("XLS export: field report fieldId={}", fieldId);
        byte[] bytes = xlsExportService.exportFieldReport(fieldId);
        return ResponseEntity.ok()
                .contentType(XLSX_MEDIA_TYPE)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"field-report-" + fieldId + ".xlsx\"")
                .body(bytes);
    }

    @Operation(
        summary = "Сводный отчёт по предприятию",
        description = "Формирует XLSX-файл со сводной информацией по всем хозяйствам. " +
                      "Отдельный лист на каждое хозяйство (структура посевных площадей: культура, площадь га, доля %) " +
                      "плюс итоговый лист «ИТОГО по предприятию»."
    )
    @ApiResponse(responseCode = "200", description = "XLSX-файл",
        content = @Content(mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
    @GetMapping("/enterprise/report/export")
    public ResponseEntity<byte[]> exportEnterpriseSummary() throws IOException {
        log.info("XLS export: enterprise summary");
        byte[] bytes = xlsExportService.exportEnterpriseSummary();
        return ResponseEntity.ok()
                .contentType(XLSX_MEDIA_TYPE)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"enterprise-report.xlsx\"".trim())
                .body(bytes);
    }

    @Operation(
        summary = "Экспорт планов посева хозяйства",
        description = "Формирует XLSX-файл со всеми планами посева хозяйства, включая комментарий директора " +
                      "при отклонении (поле «Комментарий директора»). Сортировка по дате создания убыванием."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "XLSX-файл",
            content = @Content(mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
        @ApiResponse(responseCode = "404", description = "Хозяйство не найдено")
    })
    @GetMapping("/farms/{farmId}/plans/export")
    public ResponseEntity<byte[]> exportSeasonPlans(
            @Parameter(description = "ID хозяйства") @PathVariable Long farmId) throws IOException {
        log.info("XLS export: season plans farmId={}", farmId);
        byte[] bytes = xlsExportService.exportSeasonPlans(farmId);
        return ResponseEntity.ok()
                .contentType(XLSX_MEDIA_TYPE)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"season-plans-farm-" + farmId + ".xlsx\"")
                .body(bytes);
    }
}
