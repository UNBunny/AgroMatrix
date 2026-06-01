package com.omstu.agriculturefield.report.service;

import com.omstu.agriculturefield.crop.model.CropHistory;
import com.omstu.agriculturefield.crop.repository.CropHistoryRepository;
import com.omstu.agriculturefield.farm.model.Farm;
import com.omstu.agriculturefield.farm.repository.FarmRepository;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import com.omstu.agriculturefield.report.model.SeasonPlan;
import com.omstu.agriculturefield.report.repository.SeasonPlanRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class XlsExportService {

    private final FarmRepository farmRepository;
    private final AgriculturalFieldRepository fieldRepository;
    private final CropHistoryRepository cropHistoryRepository;
    private final SeasonPlanRepository seasonPlanRepository;

    // ── 1. История посевов хозяйства ─────────────────────────────────────────

    public byte[] exportFarmCropHistory(Long farmId) throws IOException {
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new NoSuchElementException("Farm not found: " + farmId));
        List<AgriculturalField> fields = fieldRepository.findAllByFarmId(farmId);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("История посевов");
            CellStyle headerStyle = buildHeaderStyle(wb);
            CellStyle dataStyle   = buildDataStyle(wb);

            // Title row
            Row title = sheet.createRow(0);
            Cell tc = title.createCell(0);
            tc.setCellValue("История посевов хозяйства: " + farm.getName());
            tc.setCellStyle(buildTitleStyle(wb));
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 6));

            // Header
            String[] headers = {"Поле", "Культура", "Сорт", "Площадь, га",
                                 "Дата посева", "Дата уборки", "Урожайность, кг"};
            Row hRow = sheet.createRow(2);
            for (int i = 0; i < headers.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            int rowIdx = 3;
            for (AgriculturalField field : fields) {
                List<CropHistory> histories =
                        cropHistoryRepository.findByFieldIdOrderByPlantingDateDesc(field.getId());
                for (CropHistory h : histories) {
                    Row r = sheet.createRow(rowIdx++);
                    setCell(r, 0, field.getFieldName(), dataStyle);
                    setCell(r, 1, h.getCropType() != null ? h.getCropType().getName() : "—", dataStyle);
                    setCell(r, 2, h.getCropVariety() != null ? h.getCropVariety().getName() : "—", dataStyle);
                    setCell(r, 3, field.getAreaHectares() != null ? field.getAreaHectares().toString() : "—", dataStyle);
                    setCell(r, 4, h.getPlantingDate() != null ? h.getPlantingDate().toString() : "—", dataStyle);
                    setCell(r, 5, h.getActualHarvestDate() != null ? h.getActualHarvestDate().toString() : "—", dataStyle);
                    setCell(r, 6, h.getActualYieldKg() != null ? h.getActualYieldKg().toPlainString() : "—", dataStyle);
                }
            }

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            return toBytes(wb);
        }
    }

    // ── 2. Отчёт по полю ─────────────────────────────────────────────────────

    public byte[] exportFieldReport(Long fieldId) throws IOException {
        AgriculturalField field = fieldRepository.findById(fieldId)
                .orElseThrow(() -> new NoSuchElementException("Field not found: " + fieldId));
        List<CropHistory> histories =
                cropHistoryRepository.findByFieldIdOrderByPlantingDateDesc(fieldId);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            // Sheet 1: Сводка
            Sheet summary = wb.createSheet("Сводка");
            CellStyle headerStyle = buildHeaderStyle(wb);
            CellStyle dataStyle   = buildDataStyle(wb);
            CellStyle titleStyle  = buildTitleStyle(wb);

            Row t = summary.createRow(0);
            Cell tc = t.createCell(0);
            tc.setCellValue("Отчёт по полю: " + field.getFieldName());
            tc.setCellStyle(titleStyle);
            summary.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));

            String[][] info = {
                {"Поле",    field.getFieldName()},
                {"Регион",  field.getRegionName() != null ? field.getRegionName() : "—"},
                {"Площадь", field.getAreaHectares() != null ? field.getAreaHectares() + " га" : "—"},
                {"Статус",  field.getStatus() != null ? field.getStatus() : "—"},
            };
            for (int i = 0; i < info.length; i++) {
                Row r = summary.createRow(i + 2);
                Cell k = r.createCell(0); k.setCellValue(info[i][0]); k.setCellStyle(headerStyle);
                Cell v = r.createCell(1); v.setCellValue(info[i][1]); v.setCellStyle(dataStyle);
            }

            // Sheet 2: Детализация посевов
            Sheet detail = wb.createSheet("Детализация посевов");
            String[] cols = {"Культура", "Сорт", "Статус", "Дата посева",
                             "Плановая уборка", "Факт. уборка", "Ожид. урожай, кг", "Факт. урожай, кг"};
            Row hRow = detail.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell c = hRow.createCell(i); c.setCellValue(cols[i]); c.setCellStyle(headerStyle);
            }
            int ri = 1;
            for (CropHistory h : histories) {
                Row r = detail.createRow(ri++);
                setCell(r, 0, h.getCropType() != null ? h.getCropType().getName() : "—", dataStyle);
                setCell(r, 1, h.getCropVariety() != null ? h.getCropVariety().getName() : "—", dataStyle);
                setCell(r, 2, h.getPlantingStatus() != null ? h.getPlantingStatus().name() : "—", dataStyle);
                setCell(r, 3, h.getPlantingDate() != null ? h.getPlantingDate().toString() : "—", dataStyle);
                setCell(r, 4, h.getExpectedHarvestDate() != null ? h.getExpectedHarvestDate().toString() : "—", dataStyle);
                setCell(r, 5, h.getActualHarvestDate() != null ? h.getActualHarvestDate().toString() : "—", dataStyle);
                setCell(r, 6, h.getExpectedYieldKg() != null ? h.getExpectedYieldKg().toPlainString() : "—", dataStyle);
                setCell(r, 7, h.getActualYieldKg() != null ? h.getActualYieldKg().toPlainString() : "—", dataStyle);
            }
            for (int i = 0; i < cols.length; i++) detail.autoSizeColumn(i);

            return toBytes(wb);
        }
    }

    // ── 3. Сводный отчёт по всем хозяйствам предприятия ────────────────────

    public byte[] exportEnterpriseSummary() throws IOException {
        List<Farm> farms = farmRepository.findAll();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            CellStyle headerStyle = buildHeaderStyle(wb);
            CellStyle dataStyle   = buildDataStyle(wb);
            CellStyle titleStyle  = buildTitleStyle(wb);

            // One sheet per farm
            Map<String, double[]> totals = new LinkedHashMap<>(); // cropName → [areaHa, count]

            for (Farm farm : farms) {
                String sheetName = farm.getName().length() > 31
                        ? farm.getName().substring(0, 31) : farm.getName();
                Sheet sheet = wb.createSheet(sheetName);

                Row title = sheet.createRow(0);
                Cell tc = title.createCell(0);
                tc.setCellValue("Хозяйство: " + farm.getName());
                tc.setCellStyle(titleStyle);
                sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));

                String[] headers = {"Культура", "Площадь, га", "Доля, %", "Кол-во полей"};
                Row hRow = sheet.createRow(2);
                for (int i = 0; i < headers.length; i++) {
                    Cell c = hRow.createCell(i); c.setCellValue(headers[i]); c.setCellStyle(headerStyle);
                }

                List<AgriculturalField> fields = fieldRepository.findAllByFarmId(farm.getId());
                Map<String, double[]> cropArea = new LinkedHashMap<>();
                double farmTotal = 0;

                for (AgriculturalField f : fields) {
                    double area = f.getAreaHectares() != null ? f.getAreaHectares() : 0;
                    String crop = f.getCropType() != null ? f.getCropType() : "Не указано";
                    cropArea.merge(crop, new double[]{area, 1},
                            (a, b) -> new double[]{a[0] + b[0], a[1] + b[1]});
                    farmTotal += area;
                    totals.merge(crop, new double[]{area, 1},
                            (a, b) -> new double[]{a[0] + b[0], a[1] + b[1]});
                }

                int ri = 3;
                for (Map.Entry<String, double[]> e : cropArea.entrySet()) {
                    Row r = sheet.createRow(ri++);
                    double pct = farmTotal > 0
                            ? BigDecimal.valueOf(e.getValue()[0] / farmTotal * 100)
                              .setScale(1, RoundingMode.HALF_UP).doubleValue() : 0;
                    setCell(r, 0, e.getKey(), dataStyle);
                    setCell(r, 1, String.format("%.2f", e.getValue()[0]), dataStyle);
                    setCell(r, 2, pct + "%", dataStyle);
                    setCell(r, 3, String.valueOf((int) e.getValue()[1]), dataStyle);
                }

                // Total row
                Row totalRow = sheet.createRow(ri);
                Cell lbl = totalRow.createCell(0); lbl.setCellValue("ИТОГО"); lbl.setCellStyle(headerStyle);
                Cell tot = totalRow.createCell(1);
                tot.setCellValue(String.format("%.2f", farmTotal)); tot.setCellStyle(headerStyle);

                for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            }

            // Summary sheet
            Sheet summary = wb.createSheet("ИТОГО по предприятию");
            Row title = summary.createRow(0);
            Cell tc = title.createCell(0);
            tc.setCellValue("Сводный отчёт по всем хозяйствам предприятия");
            tc.setCellStyle(titleStyle);
            summary.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));

            String[] headers = {"Культура", "Площадь, га", "Доля, %", "Кол-во полей"};
            Row hRow = summary.createRow(2);
            for (int i = 0; i < headers.length; i++) {
                Cell c = hRow.createCell(i); c.setCellValue(headers[i]); c.setCellStyle(headerStyle);
            }

            double grandTotal = totals.values().stream().mapToDouble(v -> v[0]).sum();
            int ri = 3;
            for (Map.Entry<String, double[]> e : totals.entrySet()) {
                Row r = summary.createRow(ri++);
                double pct = grandTotal > 0
                        ? BigDecimal.valueOf(e.getValue()[0] / grandTotal * 100)
                          .setScale(1, RoundingMode.HALF_UP).doubleValue() : 0;
                setCell(r, 0, e.getKey(), dataStyle);
                setCell(r, 1, String.format("%.2f", e.getValue()[0]), dataStyle);
                setCell(r, 2, pct + "%", dataStyle);
                setCell(r, 3, String.valueOf((int) e.getValue()[1]), dataStyle);
            }
            Row totalRow = summary.createRow(ri);
            Cell lbl = totalRow.createCell(0); lbl.setCellValue("ИТОГО"); lbl.setCellStyle(headerStyle);
            Cell tot = totalRow.createCell(1);
            tot.setCellValue(String.format("%.2f", grandTotal)); tot.setCellStyle(headerStyle);

            for (int i = 0; i < headers.length; i++) summary.autoSizeColumn(i);

            return toBytes(wb);
        }
    }

    // ── 4. Планы посева хозяйства (с комментарием директора) ─────────────────

    public byte[] exportSeasonPlans(Long farmId) throws IOException {
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new NoSuchElementException("Farm not found: " + farmId));
        List<SeasonPlan> plans = seasonPlanRepository.findAllByFarmIdOrderByCreatedAtDesc(farmId);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Планы посева");
            CellStyle headerStyle = buildHeaderStyle(wb);
            CellStyle dataStyle   = buildDataStyle(wb);

            Row title = sheet.createRow(0);
            Cell tc = title.createCell(0);
            tc.setCellValue("Планы посева: " + farm.getName());
            tc.setCellStyle(buildTitleStyle(wb));
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 7));

            String[] headers = {"Поле", "Культура", "Сезон", "Статус",
                                 "Автор", "Проверил", "Дата создания", "Комментарий директора"};
            Row hRow = sheet.createRow(2);
            for (int i = 0; i < headers.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            int rowIdx = 3;
            for (SeasonPlan p : plans) {
                Row r = sheet.createRow(rowIdx++);
                setCell(r, 0, p.getField() != null ? p.getField().getFieldName() : "—", dataStyle);
                setCell(r, 1, p.getCropType(), dataStyle);
                setCell(r, 2, p.getSeason(), dataStyle);
                setCell(r, 3, p.getStatus().name(), dataStyle);
                setCell(r, 4, p.getCreatedByUsername() != null ? p.getCreatedByUsername() : "—", dataStyle);
                setCell(r, 5, p.getReviewedByUsername() != null ? p.getReviewedByUsername() : "—", dataStyle);
                setCell(r, 6, p.getCreatedAt() != null ? p.getCreatedAt().toLocalDate().toString() : "—", dataStyle);
                setCell(r, 7, p.getReviewComment() != null ? p.getReviewComment() : "—", dataStyle);
            }

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            return toBytes(wb);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void setCell(Row row, int col, String value, CellStyle style) {
        Cell c = row.createCell(col);
        c.setCellValue(value);
        c.setCellStyle(style);
    }

    private byte[] toBytes(XSSFWorkbook wb) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        wb.write(out);
        return out.toByteArray();
    }

    private CellStyle buildTitleStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        Font f = wb.createFont();
        f.setBold(true); f.setFontHeightInPoints((short) 13);
        s.setFont(f);
        s.setAlignment(HorizontalAlignment.LEFT);
        return s;
    }

    private CellStyle buildHeaderStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        Font f = wb.createFont();
        f.setBold(true); f.setFontHeightInPoints((short) 11);
        s.setFont(f);
        s.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.setBorderBottom(BorderStyle.THIN);
        s.setBorderTop(BorderStyle.THIN);
        s.setBorderLeft(BorderStyle.THIN);
        s.setBorderRight(BorderStyle.THIN);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setWrapText(true);
        return s;
    }

    private CellStyle buildDataStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        Font f = wb.createFont();
        f.setFontHeightInPoints((short) 11);
        s.setFont(f);
        s.setBorderBottom(BorderStyle.THIN);
        s.setBorderTop(BorderStyle.THIN);
        s.setBorderLeft(BorderStyle.THIN);
        s.setBorderRight(BorderStyle.THIN);
        s.setAlignment(HorizontalAlignment.LEFT);
        return s;
    }
}
