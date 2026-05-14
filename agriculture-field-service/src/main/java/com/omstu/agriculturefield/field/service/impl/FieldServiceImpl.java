package com.omstu.agriculturefield.field.service.impl;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.field.dto.AgriculturalFieldRequest;
import com.omstu.agriculturefield.field.dto.AgriculturalFieldResponse;
import com.omstu.agriculturefield.field.mapper.AgriculturalFieldMapper;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import com.omstu.agriculturefield.crop.repository.CropHistoryRepository;
import com.omstu.agriculturefield.field.service.FieldService;
import com.omstu.agriculturefield.field.service.NdviServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class FieldServiceImpl implements FieldService {
    private final AgriculturalFieldRepository fieldRepository;
    private final AgriculturalFieldMapper fieldMapper;
    private final NdviServiceClient ndviServiceClient;
    private final CropHistoryRepository cropHistoryRepository;

    private static final Set<String> VALID_STATUSES = Set.of("ACTIVE", "INACTIVE", "FALLOW", "PENDING");

    @Override
    public AgriculturalFieldResponse createField(AgriculturalFieldRequest request) {
        validateFieldRequest(request, null);

        AgriculturalField field = fieldMapper.toEntity(request);
        AgriculturalField savedField = fieldRepository.save(field);
        log.info("Agricultural field created with ID: {}", savedField.getId());
        if (savedField.getGeom() != null) {
            List<List<Double>> coordinates = extractCoordinates(savedField);
            ndviServiceClient.initNdviHistoryAsync(savedField.getId(), savedField.getFieldName(), coordinates);
        }
        return fieldMapper.toResponse(savedField);
    }

    private void validateFieldRequest(AgriculturalFieldRequest request, Long existingId) {
        // Validate field name
        if (request.fieldName() == null || request.fieldName().trim().isEmpty()) {
            throw new ValidationException("Field name cannot be empty");
        }

        // Check for duplicate field name
        if (existingId == null) {
            if (fieldRepository.existsByFieldName(request.fieldName())) {
                throw new ConflictException("Field with name '" + request.fieldName() + "' already exists");
            }
        } else {
            if (fieldRepository.existsByFieldNameAndIdNot(request.fieldName(), existingId)) {
                throw new ConflictException("Field with name '" + request.fieldName() + "' already exists");
            }
        }

        // Validate area
        if (request.areaHectares() != null && request.areaHectares() < 0) {
            throw new ValidationException("Area cannot be negative");
        }

        // Validate polygon coordinates (at least 4 points for a valid polygon)
        if (request.coordinates() != null && request.coordinates().size() < 4) {
            throw new ValidationException("Polygon must have at least 4 points");
        }

        // Validate status
        if (request.status() != null && !VALID_STATUSES.contains(request.status())) {
            throw new ValidationException("Invalid status: " + request.status() + ". Valid values: " + VALID_STATUSES);
        }
    }

    private List<List<Double>> extractCoordinates(AgriculturalField field) {
        Coordinate[] jtsCoords = field.getGeom().getExteriorRing().getCoordinates();
        List<List<Double>> result = new ArrayList<>();
        for (Coordinate c : jtsCoords) {
            result.add(List.of(c.x, c.y));
        }
        return result;
    }

    @Override
    public List<AgriculturalFieldResponse> getAllFields() {

        return fieldRepository.findAll().stream()
                .map(fieldMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public AgriculturalFieldResponse getFieldById(Long id) {
        AgriculturalField field = fieldRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Field not found with id: " + id));
        return fieldMapper.toResponse(field);
    }

    @Override
    public AgriculturalFieldResponse updateField(Long id, AgriculturalFieldRequest request) {
        AgriculturalField field = fieldRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Field not found with id: " + id));
        validateFieldRequest(request, id);
        AgriculturalField updatedField = fieldMapper.toEntityWithId(id, request);
        fieldRepository.save(updatedField);
        log.info("Agricultural field updated with ID: {}", updatedField.getId());
        return fieldMapper.toResponse(updatedField);
    }

    @Override
    @Transactional
    public void deleteField(Long id) {
        if (!fieldRepository.existsById(id)) {
            throw new NotFoundException("Field not found with id: " + id);
        }
        cropHistoryRepository.deleteByFieldId(id);
        fieldRepository.deleteById(id);
        log.info("Agricultural field deleted with ID: {}", id);
    }
}
