package com.omstu.agriculturefield.report.service;

import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.crop.model.FertilizerApplication;
import com.omstu.agriculturefield.crop.model.PhenologicalObservation;
import com.omstu.agriculturefield.crop.model.PlantProtectionOperation;
import com.omstu.agriculturefield.crop.model.CropHistory;
import com.omstu.agriculturefield.crop.repository.CropHistoryRepository;
import com.omstu.agriculturefield.crop.repository.FertilizerApplicationRepository;
import com.omstu.agriculturefield.crop.repository.PhenologicalObservationRepository;
import com.omstu.agriculturefield.crop.repository.PlantProtectionRepository;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import com.omstu.agriculturefield.report.dto.FieldReportResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FieldReportService {

    private final AgriculturalFieldRepository fieldRepository;
    private final CropHistoryRepository cropHistoryRepository;
    private final FertilizerApplicationRepository fertilizerRepo;
    private final PhenologicalObservationRepository phenologyRepo;
    private final PlantProtectionRepository protectionRepo;

    public FieldReportResponse getFieldReport(
            Long fieldId,
            Long farmId,
            String dateFrom,
            String dateTo,
            Long cropHistoryId
    ) {
        AgriculturalField field = farmId != null
                ? fieldRepository.findByIdAndFarmId(fieldId, farmId)
                        .orElseThrow(() -> new NotFoundException("Field not found: " + fieldId))
                : fieldRepository.findById(fieldId)
                        .orElseThrow(() -> new NotFoundException("Field not found: " + fieldId));

        LocalDate from = dateFrom != null ? LocalDate.parse(dateFrom) : LocalDate.now().minusMonths(6);
        LocalDate to   = dateTo   != null ? LocalDate.parse(dateTo)   : LocalDate.now();

        List<CropHistory> histories = cropHistoryId != null
                ? cropHistoryRepository.findById(cropHistoryId).map(List::of).orElse(List.of())
                : cropHistoryRepository.findByFieldIdOrderByPlantingDateDesc(fieldId);

        List<Long> historyIds = histories.stream().map(CropHistory::getId).toList();

        // Aggregate fertilizer applications
        List<FertilizerApplication> allFertilizer = historyIds.stream()
                .flatMap(hid -> fertilizerRepo.findByCropHistoryIdOrderByApplicationDateAsc(hid).stream())
                .filter(f -> !f.getApplicationDate().isBefore(from) && !f.getApplicationDate().isAfter(to))
                .collect(Collectors.toList());

        // Aggregate protection operations
        List<PlantProtectionOperation> allProtection = historyIds.stream()
                .flatMap(hid -> protectionRepo.findByCropHistoryIdOrderByOperationDateAsc(hid).stream())
                .filter(p -> !p.getOperationDate().isBefore(from) && !p.getOperationDate().isAfter(to))
                .collect(Collectors.toList());

        // Aggregate phenological observations
        List<PhenologicalObservation> allPhenology = historyIds.stream()
                .flatMap(hid -> phenologyRepo.findByCropHistoryIdOrderByObservationDateAsc(hid).stream())
                .filter(p -> !p.getObservationDate().isBefore(from) && !p.getObservationDate().isAfter(to))
                .collect(Collectors.toList());

        // Metrics
        BigDecimal totalFertKg = allFertilizer.stream()
                .filter(f -> f.getTotalAmountKg() != null)
                .map(f -> BigDecimal.valueOf(f.getTotalAmountKg()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal actualYield = histories.stream()
                .filter(h -> h.getActualYieldKg() != null).map(CropHistory::getActualYieldKg)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expectedYield = histories.stream()
                .filter(h -> h.getExpectedYieldKg() != null).map(CropHistory::getExpectedYieldKg)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        PhenologicalObservation lastObs = allPhenology.isEmpty() ? null : allPhenology.getLast();
        String cropType = histories.isEmpty() ? field.getCropType()
                : histories.getFirst().getCropType() != null ? histories.getFirst().getCropType().getName() : field.getCropType();

        FieldReportResponse.FieldReportMetrics metrics = new FieldReportResponse.FieldReportMetrics(
                field.getId(),
                field.getFieldName(),
                cropType,
                field.getStatus(),
                field.getAreaHectares(),
                allFertilizer.size(),
                allProtection.size(),
                totalFertKg,
                actualYield.compareTo(BigDecimal.ZERO) == 0 ? null : actualYield,
                expectedYield.compareTo(BigDecimal.ZERO) == 0 ? null : expectedYield,
                lastObs != null ? lastObs.getObservationDate().toString() : null,
                lastObs != null ? lastObs.getBbchScale() : null
        );

        // Build timeline by date (grouped by day)
        Map<LocalDate, FieldReportResponse.TimelinePoint> timeline = new TreeMap<>();

        for (FertilizerApplication f : allFertilizer) {
            timeline.merge(f.getApplicationDate(),
                    new FieldReportResponse.TimelinePoint(
                            f.getApplicationDate().toString(),
                            f.getTotalAmountKg() != null ? BigDecimal.valueOf(f.getTotalAmountKg()) : BigDecimal.ZERO,
                            0, null, null),
                    (a, b) -> new FieldReportResponse.TimelinePoint(
                            a.date(),
                            a.fertilizerKg().add(b.fertilizerKg()),
                            a.protectionOps(), a.bbchScale(), a.ndviMean())
            );
        }

        for (PlantProtectionOperation p : allProtection) {
            timeline.merge(p.getOperationDate(),
                    new FieldReportResponse.TimelinePoint(p.getOperationDate().toString(), BigDecimal.ZERO, 1, null, null),
                    (a, b) -> new FieldReportResponse.TimelinePoint(
                            a.date(), a.fertilizerKg(), (a.protectionOps() != null ? a.protectionOps() : 0) + 1,
                            a.bbchScale(), a.ndviMean())
            );
        }

        for (PhenologicalObservation obs : allPhenology) {
            LocalDate d = obs.getObservationDate();
            timeline.merge(d,
                    new FieldReportResponse.TimelinePoint(d.toString(), BigDecimal.ZERO, 0, obs.getBbchScale(), null),
                    (a, b) -> new FieldReportResponse.TimelinePoint(
                            a.date(), a.fertilizerKg(), a.protectionOps(), obs.getBbchScale(), a.ndviMean())
            );
        }

        List<FieldReportResponse.TimelinePoint> timelineList = new ArrayList<>(timeline.values());

        return new FieldReportResponse(metrics, timelineList);
    }
}
