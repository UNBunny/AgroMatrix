package com.omstu.agriculturefield.field.service.impl;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.field.dto.SoilHorizonRequest;
import com.omstu.agriculturefield.field.dto.SoilHorizonResponse;
import com.omstu.agriculturefield.field.mapper.SoilHorizonMapper;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.model.SoilHorizon;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import com.omstu.agriculturefield.field.repository.SoilHorizonRepository;
import com.omstu.agriculturefield.field.service.SoilHorizonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class SoilHorizonServiceImpl implements SoilHorizonService {

    private final SoilHorizonRepository soilHorizonRepository;
    private final SoilHorizonMapper soilHorizonMapper;
    private final AgriculturalFieldRepository fieldRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SoilHorizonResponse> getByFieldId(Long fieldId) {
        return soilHorizonRepository.findByFieldIdOrderByDepthFromCm(fieldId)
                .stream()
                .map(soilHorizonMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SoilHorizonResponse getById(Long id) {
        return soilHorizonRepository.findById(id)
                .map(soilHorizonMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Soil horizon not found with id: " + id));
    }

    @Override
    @Transactional
    public SoilHorizonResponse create(SoilHorizonRequest request) {
        if (request.depthFromCm() >= request.depthToCm()) {
            throw new ValidationException("depthFromCm must be less than depthToCm");
        }

        AgriculturalField field = fieldRepository.findById(request.fieldId())
                .orElseThrow(() -> new NotFoundException("Field not found: " + request.fieldId()));

        if (soilHorizonRepository.existsByFieldIdAndDepthFromCm(request.fieldId(), request.depthFromCm())) {
            throw new ConflictException("Soil horizon starting at " + request.depthFromCm() + " cm already exists for field: " + request.fieldId());
        }

        SoilHorizon horizon = soilHorizonMapper.toEntity(request);
        horizon.setField(field);

        SoilHorizon saved = soilHorizonRepository.save(horizon);
        log.info("Created soil horizon id={} for field id={}", saved.getId(), field.getId());
        return soilHorizonMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SoilHorizonResponse update(Long id, SoilHorizonRequest request) {
        if (request.depthFromCm() >= request.depthToCm()) {
            throw new ValidationException("depthFromCm must be less than depthToCm");
        }

        SoilHorizon existing = soilHorizonRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Soil horizon not found with id: " + id));

        AgriculturalField field = fieldRepository.findById(request.fieldId())
                .orElseThrow(() -> new NotFoundException("Field not found: " + request.fieldId()));

        soilHorizonMapper.updateEntity(request, existing);
        existing.setField(field);

        SoilHorizon updated = soilHorizonRepository.save(existing);
        log.info("Updated soil horizon id={}", updated.getId());
        return soilHorizonMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        SoilHorizon horizon = soilHorizonRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Soil horizon not found with id: " + id));
        soilHorizonRepository.delete(horizon);
        log.info("Deleted soil horizon id={}", id);
    }
}
