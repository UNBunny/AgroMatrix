package com.omstu.agriculturefield.crop.service.impl;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.crop.dto.CropTypeRequest;
import com.omstu.agriculturefield.crop.dto.CropTypeResponse;
import com.omstu.agriculturefield.crop.mapper.CropTypeMapper;
import com.omstu.agriculturefield.crop.model.CropType;
import com.omstu.agriculturefield.crop.repository.CropHistoryRepository;
import com.omstu.agriculturefield.crop.repository.CropTypeRepository;
import com.omstu.agriculturefield.crop.repository.CropVarietyRepository;
import com.omstu.agriculturefield.disease.repository.DiseaseRepository;
import com.omstu.agriculturefield.disease.repository.DiseaseResistanceRepository;
import com.omstu.agriculturefield.rotation.repository.CropRotationRuleRepository;
import com.omstu.agriculturefield.common.service.BaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class CropTypeServiceImpl implements BaseService<CropTypeRequest, CropTypeResponse, Long> {

    private static final Set<String> VALID_CATEGORIES = Set.of("GRAIN", "LEGUME", "OILSEED", "VEGETABLE", "FRUIT", "FORAGE", "OTHER");

    private final CropTypeRepository cropTypeRepository;
    private final CropTypeMapper cropTypeMapper;
    private final CropHistoryRepository cropHistoryRepository;
    private final CropVarietyRepository cropVarietyRepository;
    private final DiseaseResistanceRepository diseaseResistanceRepository;
    private final DiseaseRepository diseaseRepository;
    private final CropRotationRuleRepository cropRotationRuleRepository;

    @Override
    public List<CropTypeResponse> getAll() {
        return cropTypeRepository.findAll()
                .stream().map(cropTypeMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CropTypeResponse getById(Long id) {
        return cropTypeRepository.findById(id)
                .map(cropTypeMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Crop type not found with id: " + id));
    }

    @Override
    public CropTypeResponse create(CropTypeRequest cropTypeRequest) {
        validateCropTypeRequest(cropTypeRequest, null);
        CropType cropTypeEntity = cropTypeMapper.toEntity(cropTypeRequest);
        CropType savedCropType = cropTypeRepository.save(cropTypeEntity);
        return cropTypeMapper.toResponse(savedCropType);
    }

    private void validateCropTypeRequest(CropTypeRequest request, Long existingId) {
        if (request.name() == null || request.name().trim().isEmpty()) {
            throw new ValidationException("Crop type name cannot be empty");
        }

        if (existingId == null) {
            if (cropTypeRepository.existsByName(request.name())) {
                throw new ConflictException("Crop type with name '" + request.name() + "' already exists");
            }
        } else {
            if (cropTypeRepository.existsByNameAndIdNot(request.name(), existingId)) {
                throw new ConflictException("Crop type with name '" + request.name() + "' already exists");
            }
        }

        if (request.growingSeasonDays() != null && request.growingSeasonDays() <= 0) {
            throw new ValidationException("Growing season days must be positive");
        }

        if (request.optimalTemperatureMin() != null && request.optimalTemperatureMax() != null) {
            if (request.optimalTemperatureMin().compareTo(request.optimalTemperatureMax()) > 0) {
                throw new ValidationException("Minimum temperature cannot be greater than maximum temperature");
            }
        }

        if (request.category() != null && !VALID_CATEGORIES.contains(request.category())) {
            throw new ValidationException("Invalid category: " + request.category() + ". Valid values: " + VALID_CATEGORIES);
        }
    }

    @Override
    public CropTypeResponse update(Long id, CropTypeRequest cropTypeRequest) {
        CropType cropTypeEntity = cropTypeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Crop type not found with id: " + id));
        validateCropTypeRequest(cropTypeRequest, id);
        CropType updatedCropType = cropTypeMapper.toEntityWithId(id, cropTypeRequest);
        cropTypeRepository.save(updatedCropType);
        return cropTypeMapper.toResponse(updatedCropType);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!cropTypeRepository.existsById(id)) {
            throw new NotFoundException("Crop type not found with id: " + id);
        }

        if (cropVarietyRepository.existsByCropTypeId(id)) {
            throw new ConflictException("Cannot delete crop type with id: " + id + " because it has related varieties");
        }

        cropRotationRuleRepository.deleteByCropTypeId(id);
        diseaseRepository.deleteAffectedCropsByCropTypeId(id);
        diseaseResistanceRepository.deleteByCropTypeId(id);
        cropHistoryRepository.deleteByCropTypeId(id);
        cropVarietyRepository.deleteByCropTypeId(id);
        cropTypeRepository.deleteById(id);
    }
}
