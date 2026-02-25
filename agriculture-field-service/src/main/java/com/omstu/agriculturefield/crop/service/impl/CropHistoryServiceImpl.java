package com.omstu.agriculturefield.crop.service.impl;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.UnprocessableEntityException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.common.service.BaseService;
import com.omstu.agriculturefield.crop.dto.CropHistoryRequest;
import com.omstu.agriculturefield.crop.dto.CropHistoryResponse;
import com.omstu.agriculturefield.crop.mapper.CropHistoryMapper;
import com.omstu.agriculturefield.crop.model.CropHistory;
import com.omstu.agriculturefield.crop.model.CropType;
import com.omstu.agriculturefield.crop.model.CropVariety;
import com.omstu.agriculturefield.crop.model.enums.PlantingStatus;
import com.omstu.agriculturefield.crop.repository.CropHistoryRepository;
import com.omstu.agriculturefield.crop.repository.CropTypeRepository;
import com.omstu.agriculturefield.crop.repository.CropVarietyRepository;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class CropHistoryServiceImpl implements BaseService<CropHistoryRequest, CropHistoryResponse, Long> {

    private static final Set<PlantingStatus> ACTIVE_STATUSES = Set.of(
            PlantingStatus.PLANTED, PlantingStatus.GROWING
    );

    private final CropHistoryRepository cropHistoryRepository;
    private final CropHistoryMapper cropHistoryMapper;
    private final AgriculturalFieldRepository agriculturalFieldRepository;
    private final CropTypeRepository cropTypeRepository;
    private final CropVarietyRepository cropVarietyRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CropHistoryResponse> getAll() {
        return cropHistoryRepository.findAll()
                .stream()
                .map(cropHistoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CropHistoryResponse getById(Long id) {
        return cropHistoryRepository.findById(id)
                .map(cropHistoryMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Crop history not found with id: " + id));
    }

    @Override
    @Transactional
    public CropHistoryResponse create(CropHistoryRequest request) {
        validateCropHistoryRequest(request, null);

        AgriculturalField field = agriculturalFieldRepository.findById(request.fieldId())
                .orElseThrow(() -> new NotFoundException("Agricultural field not found with id: " + request.fieldId()));

        CropType cropType = cropTypeRepository.findById(request.cropTypeId())
                .orElseThrow(() -> new NotFoundException("Crop type not found with id: " + request.cropTypeId()));

        CropHistory cropHistory = cropHistoryMapper.toEntity(request);
        cropHistory.setField(field);
        cropHistory.setCropType(cropType);

        if (request.cropVarietyId() != null) {
            CropVariety cropVariety = cropVarietyRepository.findById(request.cropVarietyId())
                    .orElseThrow(() -> new NotFoundException("Crop variety not found with id: " + request.cropVarietyId()));
            cropHistory.setCropVariety(cropVariety);
        }

        CropHistory saved = cropHistoryRepository.save(cropHistory);
        log.info("Created crop history with id: {}", saved.getId());
        return cropHistoryMapper.toResponse(saved);
    }

    private void validateCropHistoryRequest(CropHistoryRequest request, Long existingId) {
        if (request.plantingDate() == null) {
            throw new ValidationException("Planting date is required");
        }

        if (request.expectedHarvestDate() != null && request.expectedHarvestDate().before(request.plantingDate())) {
            throw new ValidationException("Expected harvest date cannot be before planting date");
        }

        if (request.plantingStatus() == null) {
            throw new ValidationException("Planting status is required");
        }

        if (existingId == null) {
            Calendar cal = Calendar.getInstance();
            cal.setTime(request.plantingDate());
            int year = cal.get(Calendar.YEAR);

            boolean hasActivePlanting = cropHistoryRepository.existsActivePlantingForFieldAndYear(
                    request.fieldId(), year, ACTIVE_STATUSES.stream().toList());

            if (hasActivePlanting) {
                throw new ConflictException("Field already has an active planting for year " + year);
            }
        }
    }

    @Override
    @Transactional
    public CropHistoryResponse update(Long id, CropHistoryRequest request) {
        validateCropHistoryRequest(request, id);

        CropHistory existing = cropHistoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Crop history not found with id: " + id));

        if (request.actualYieldKg() != null && request.plantingStatus() != PlantingStatus.HARVESTED) {
            throw new UnprocessableEntityException("Actual yield can only be set when planting status is HARVESTED");
        }

        AgriculturalField field = agriculturalFieldRepository.findById(request.fieldId())
                .orElseThrow(() -> new NotFoundException("Agricultural field not found with id: " + request.fieldId()));

        CropType cropType = cropTypeRepository.findById(request.cropTypeId())
                .orElseThrow(() -> new NotFoundException("Crop type not found with id: " + request.cropTypeId()));

        cropHistoryMapper.updateEntity(request, existing);
        existing.setField(field);
        existing.setCropType(cropType);

        if (request.cropVarietyId() != null) {
            CropVariety cropVariety = cropVarietyRepository.findById(request.cropVarietyId())
                    .orElseThrow(() -> new NotFoundException("Crop variety not found with id: " + request.cropVarietyId()));
            existing.setCropVariety(cropVariety);
        } else {
            existing.setCropVariety(null);
        }

        CropHistory updated = cropHistoryRepository.save(existing);
        log.info("Updated crop history with id: {}", updated.getId());
        return cropHistoryMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        CropHistory cropHistory = cropHistoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Crop history not found with id: " + id));
        cropHistoryRepository.delete(cropHistory);
        log.info("Deleted crop history with id: {}", id);
    }
}