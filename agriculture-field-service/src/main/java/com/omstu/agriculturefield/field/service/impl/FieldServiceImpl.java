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
import com.omstu.agriculturefield.field.kafka.FieldCreatedEvent;
import com.omstu.agriculturefield.field.kafka.FieldEventProducer;
import com.omstu.agriculturefield.field.service.FieldService;
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
    private final FieldEventProducer fieldEventProducer;
    private final CropHistoryRepository cropHistoryRepository;

    private static final Set<String> VALID_STATUSES = Set.of("ACTIVE", "INACTIVE", "FALLOW", "PENDING");

    @Override
    public AgriculturalFieldResponse createField(AgriculturalFieldRequest request, Long farmId) {
        validateFieldRequest(request, null, farmId);

        AgriculturalField field = fieldMapper.toEntity(request);
        field.setFarmId(farmId);
        AgriculturalField savedField = fieldRepository.save(field);
        log.info("Agricultural field created with ID: {}, farmId: {}", savedField.getId(), farmId);
        if (savedField.getGeom() != null) {
            List<List<Double>> coordinates = extractCoordinates(savedField);
            fieldEventProducer.sendFieldCreated(
                    new FieldCreatedEvent(savedField.getId(), savedField.getFieldName(), coordinates));
        }
        return fieldMapper.toResponse(savedField);
    }

    private void validateFieldRequest(AgriculturalFieldRequest request, Long existingId, Long farmId) {
        // Validate field name
        if (request.fieldName() == null || request.fieldName().trim().isEmpty()) {
            throw new ValidationException("Field name cannot be empty");
        }

        // Check for duplicate field name within the same farm
        if (existingId == null) {
            if (farmId != null && fieldRepository.existsByFieldNameAndFarmId(request.fieldName(), farmId)) {
                throw new ConflictException("Field with name '" + request.fieldName() + "' already exists");
            } else if (farmId == null && fieldRepository.existsByFieldName(request.fieldName())) {
                throw new ConflictException("Field with name '" + request.fieldName() + "' already exists");
            }
        } else {
            if (farmId != null && fieldRepository.existsByFieldNameAndIdNotAndFarmId(request.fieldName(), existingId, farmId)) {
                throw new ConflictException("Field with name '" + request.fieldName() + "' already exists");
            } else if (farmId == null && fieldRepository.existsByFieldNameAndIdNot(request.fieldName(), existingId)) {
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
    public List<AgriculturalFieldResponse> getAllFields(Long farmId) {
        if (farmId != null) {
            return fieldRepository.findAllByFarmId(farmId).stream()
                    .map(fieldMapper::toResponse)
                    .collect(Collectors.toList());
        }
        return fieldRepository.findAll().stream()
                .map(fieldMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public AgriculturalFieldResponse getFieldById(Long id, Long farmId) {
        AgriculturalField field = farmId != null
                ? fieldRepository.findByIdAndFarmId(id, farmId)
                        .orElseThrow(() -> new NotFoundException("Field not found with id: " + id))
                : fieldRepository.findById(id)
                        .orElseThrow(() -> new NotFoundException("Field not found with id: " + id));
        return fieldMapper.toResponse(field);
    }

    @Override
    public AgriculturalFieldResponse updateField(Long id, AgriculturalFieldRequest request, Long farmId) {
        AgriculturalField field = farmId != null
                ? fieldRepository.findByIdAndFarmId(id, farmId)
                        .orElseThrow(() -> new NotFoundException("Field not found with id: " + id))
                : fieldRepository.findById(id)
                        .orElseThrow(() -> new NotFoundException("Field not found with id: " + id));
        validateFieldRequest(request, id, farmId);
        AgriculturalField updatedField = fieldMapper.toEntityWithId(id, request);
        updatedField.setFarmId(field.getFarmId());
        fieldRepository.save(updatedField);
        log.info("Agricultural field updated with ID: {}", updatedField.getId());
        return fieldMapper.toResponse(updatedField);
    }

    @Override
    @Transactional
    public void deleteField(Long id, Long farmId) {
        AgriculturalField field = farmId != null
                ? fieldRepository.findByIdAndFarmId(id, farmId)
                        .orElseThrow(() -> new NotFoundException("Field not found with id: " + id))
                : fieldRepository.findById(id)
                        .orElseThrow(() -> new NotFoundException("Field not found with id: " + id));
        cropHistoryRepository.deleteByFieldId(field.getId());
        fieldRepository.deleteById(field.getId());
        log.info("Agricultural field deleted with ID: {}", id);
    }
}
