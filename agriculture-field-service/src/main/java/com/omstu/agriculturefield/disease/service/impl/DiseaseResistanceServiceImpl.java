package com.omstu.agriculturefield.disease.service.impl;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.common.service.BaseService;
import com.omstu.agriculturefield.crop.model.CropVariety;
import com.omstu.agriculturefield.crop.repository.CropVarietyRepository;
import com.omstu.agriculturefield.disease.dto.DiseaseResistanceRequest;
import com.omstu.agriculturefield.disease.dto.DiseaseResistanceResponse;
import com.omstu.agriculturefield.disease.mapper.DiseaseResistanceMapper;
import com.omstu.agriculturefield.disease.model.Disease;
import com.omstu.agriculturefield.disease.model.DiseaseResistance;
import com.omstu.agriculturefield.disease.repository.DiseaseRepository;
import com.omstu.agriculturefield.disease.repository.DiseaseResistanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class DiseaseResistanceServiceImpl implements BaseService<DiseaseResistanceRequest, DiseaseResistanceResponse, Long> {
    private final DiseaseResistanceRepository diseaseResistanceRepository;
    private final DiseaseResistanceMapper diseaseResistanceMapper;
    private final DiseaseRepository diseaseRepository;
    private final CropVarietyRepository cropVarietyRepository;

    @Override
    @Transactional(readOnly = true)
    public List<DiseaseResistanceResponse> getAll() {
        return diseaseResistanceRepository.findAll()
                .stream()
                .map(diseaseResistanceMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DiseaseResistanceResponse getById(Long id) {
        return diseaseResistanceRepository.findById(id)
                .map(diseaseResistanceMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Disease resistance not found with id: " + id));
    }

    @Override
    @Transactional
    public DiseaseResistanceResponse create(DiseaseResistanceRequest request) {
        validateDiseaseResistanceRequest(request);

        Disease disease = diseaseRepository.findById(request.diseaseId())
                .orElseThrow(() -> new NotFoundException("Disease not found with id: " + request.diseaseId()));

        CropVariety cropVariety = cropVarietyRepository.findById(request.cropVarietyId())
                .orElseThrow(() -> new NotFoundException("Crop variety not found with id: " + request.cropVarietyId()));

        // Check for duplicate pair
        if (diseaseResistanceRepository.existsByDiseaseIdAndCropVarietyId(request.diseaseId(), request.cropVarietyId())) {
            throw new ConflictException("Disease resistance for this disease and crop variety pair already exists");
        }

        DiseaseResistance diseaseResistance = diseaseResistanceMapper.toEntity(request);
        diseaseResistance.setDisease(disease);
        diseaseResistance.setCropVariety(cropVariety);

        DiseaseResistance saved = diseaseResistanceRepository.save(diseaseResistance);
        log.info("Created disease resistance with id: {}", saved.getId());
        return diseaseResistanceMapper.toResponse(saved);
    }

    private void validateDiseaseResistanceRequest(DiseaseResistanceRequest request) {
        // Validate resistanceLevel
        if (request.resistanceLevel() == null) {
            throw new ValidationException("Resistance level is required");
        }

        Set<String> validLevels = Set.of("SUSCEPTIBLE", "MODERATELY_SUSCEPTIBLE", "MODERATELY_RESISTANT", "RESISTANT", "HIGHLY_RESISTANT");
        String levelName = request.resistanceLevel().name();
        if (!validLevels.contains(levelName)) {
            throw new ValidationException("Invalid resistance level: " + levelName);
        }
    }

    @Override
    @Transactional
    public DiseaseResistanceResponse update(Long id, DiseaseResistanceRequest request) {
        DiseaseResistance existing = diseaseResistanceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Disease resistance not found with id: " + id));

        validateDiseaseResistanceRequest(request);

        Disease disease = diseaseRepository.findById(request.diseaseId())
                .orElseThrow(() -> new NotFoundException("Disease not found with id: " + request.diseaseId()));

        CropVariety cropVariety = cropVarietyRepository.findById(request.cropVarietyId())
                .orElseThrow(() -> new NotFoundException("Crop variety not found with id: " + request.cropVarietyId()));

        existing.setDisease(disease);
        existing.setCropVariety(cropVariety);
        existing.setResistanceLevel(request.resistanceLevel());

        DiseaseResistance updated = diseaseResistanceRepository.save(existing);
        log.info("Updated disease resistance with id: {}", updated.getId());
        return diseaseResistanceMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        DiseaseResistance diseaseResistance = diseaseResistanceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Disease resistance not found with id: " + id));
        diseaseResistanceRepository.delete(diseaseResistance);
        log.info("Deleted disease resistance with id: {}", id);
    }
}
