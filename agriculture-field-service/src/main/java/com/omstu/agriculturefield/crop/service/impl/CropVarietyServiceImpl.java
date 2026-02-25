package com.omstu.agriculturefield.crop.service.impl;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.crop.dto.CropVarietyRequest;
import com.omstu.agriculturefield.crop.dto.CropVarietyResponse;
import com.omstu.agriculturefield.crop.mapper.CropVarietyMapper;
import com.omstu.agriculturefield.crop.model.CropType;
import com.omstu.agriculturefield.crop.model.CropVariety;
import com.omstu.agriculturefield.crop.repository.CropTypeRepository;
import com.omstu.agriculturefield.crop.repository.CropVarietyRepository;
import com.omstu.agriculturefield.common.service.BaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class CropVarietyServiceImpl implements BaseService<CropVarietyRequest, CropVarietyResponse, Long> {

    private static final Set<String> VALID_TOLERANCE_LEVELS = Set.of("LOW", "MEDIUM", "HIGH", "VERY_HIGH");

    private final CropVarietyRepository cropVarietyRepository;
    private final CropVarietyMapper cropVarietyMapper;
    private final CropTypeRepository cropTypeRepository;

    @Override
    public List<CropVarietyResponse> getAll() {
        return cropVarietyRepository.findAll().stream()
                .map(cropVarietyMapper::toResponse)
                .toList();
    }

    @Override
    public CropVarietyResponse getById(Long aLong) {
        return cropVarietyRepository.findById(aLong)
                .map(cropVarietyMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Crop variety not found with id: " + aLong));
    }

    @Override
    public CropVarietyResponse create(CropVarietyRequest request) {
        validateCropVarietyRequest(request, null);

        CropType cropType = cropTypeRepository.findById(request.cropTypeId())
                .orElseThrow(() -> new NotFoundException("Crop type not found with id: " + request.cropTypeId()));

        CropVariety cropVariety = cropVarietyMapper.toEntity(request);
        cropVariety.setCropType(cropType);
        CropVariety savedCropVariety = cropVarietyRepository.save(cropVariety);
        return cropVarietyMapper.toResponse(savedCropVariety);
    }

    private void validateCropVarietyRequest(CropVarietyRequest request, Long existingId) {
        if (request.name() == null || request.name().trim().isEmpty()) {
            throw new ValidationException("Crop variety name cannot be empty");
        }

        if (request.cropTypeId() == null) {
            throw new ValidationException("Crop type ID is required");
        }

        if (request.maturationDays() != null && request.maturationDays() <= 0) {
            throw new ValidationException("Maturation days must be positive");
        }

        if (request.droughtTolerance() != null) {
            String tolerance = request.droughtTolerance().name();
            if (!VALID_TOLERANCE_LEVELS.contains(tolerance)) {
                throw new ValidationException("Invalid drought tolerance: " + tolerance);
            }
        }

        if (existingId == null) {
            if (cropVarietyRepository.existsByNameAndCropTypeId(request.name(), request.cropTypeId())) {
                throw new ConflictException("Crop variety with name '" + request.name() + "' already exists for this crop type");
            }
        }
    }

    @Override
    public CropVarietyResponse update(Long aLong, CropVarietyRequest request) {
        CropVariety existing = cropVarietyRepository.findById(aLong)
                .orElseThrow(() -> new NotFoundException("Crop variety not found with id: " + aLong));
        validateCropVarietyRequest(request, aLong);

        CropType cropType = cropTypeRepository.findById(request.cropTypeId())
                .orElseThrow(() -> new NotFoundException("Crop type not found with id: " + request.cropTypeId()));

        CropVariety updated = cropVarietyMapper.toEntity(request);
        updated.setId(aLong);
        updated.setCropType(cropType);
        CropVariety saved = cropVarietyRepository.save(updated);
        return cropVarietyMapper.toResponse(saved);
    }

    @Override
    public void delete(Long aLong) {
        if (!cropVarietyRepository.existsById(aLong)) {
            throw new NotFoundException("Crop variety not found with id: " + aLong);
        }
        cropVarietyRepository.deleteById(aLong);
    }
}
