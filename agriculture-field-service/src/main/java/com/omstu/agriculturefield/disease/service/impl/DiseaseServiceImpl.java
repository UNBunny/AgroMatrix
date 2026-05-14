package com.omstu.agriculturefield.disease.service.impl;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.common.service.BaseService;
import com.omstu.agriculturefield.crop.model.CropType;
import com.omstu.agriculturefield.crop.repository.CropTypeRepository;
import com.omstu.agriculturefield.disease.dto.DiseaseRequest;
import com.omstu.agriculturefield.disease.dto.DiseaseResponse;
import com.omstu.agriculturefield.disease.mapper.DiseaseMapper;
import com.omstu.agriculturefield.disease.model.Disease;
import com.omstu.agriculturefield.disease.repository.DiseaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class DiseaseServiceImpl implements BaseService<DiseaseRequest, DiseaseResponse, Long> {
    private final DiseaseRepository diseaseRepository;
    private final DiseaseMapper diseaseMapper;
    private final CropTypeRepository cropTypeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<DiseaseResponse> getAll() {
        return diseaseRepository.findAll()
                .stream()
                .map(diseaseMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DiseaseResponse getById(Long id) {
        return diseaseRepository.findById(id)
                .map(diseaseMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Disease not found with id: " + id));
    }

    @Override
    @Transactional
    public DiseaseResponse create(DiseaseRequest request) {
        validateDiseaseRequest(request, null);

        Disease disease = diseaseMapper.toEntity(request);

        // Устанавливаем affectedCrops из списка ID
        if (request.affectedCropIds() != null && !request.affectedCropIds().isEmpty()) {
            Set<CropType> affectedCrops = new HashSet<>(
                    cropTypeRepository.findAllById(request.affectedCropIds())
            );
            disease.setAffectedCrops(affectedCrops);
        } else {
            disease.setAffectedCrops(new HashSet<>());
        }

        Disease savedDisease = diseaseRepository.save(disease);
        log.info("Created disease with id: {}", savedDisease.getId());
        return diseaseMapper.toResponse(savedDisease);
    }

    private void validateDiseaseRequest(DiseaseRequest request, Long existingId) {
        // Validate commonName
        if (request.commonName() == null || request.commonName().trim().isEmpty()) {
            throw new ValidationException("Common name cannot be empty");
        }

        // Validate scientificName uniqueness
        if (request.scientificName() != null && !request.scientificName().trim().isEmpty()) {
            if (existingId == null) {
                if (diseaseRepository.existsByScientificName(request.scientificName())) {
                    throw new ConflictException("Disease with scientific name '" + request.scientificName() + "' already exists");
                }
            } else {
                if (diseaseRepository.existsByScientificNameAndIdNot(request.scientificName(), existingId)) {
                    throw new ConflictException("Disease with scientific name '" + request.scientificName() + "' already exists");
                }
            }
        }
    }

    @Override
    @Transactional
    public DiseaseResponse update(Long id, DiseaseRequest request) {
        Disease existingDisease = diseaseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Disease not found with id: " + id));
        validateDiseaseRequest(request, id);

        // Обновляем поля
        existingDisease.setScientificName(request.scientificName());
        existingDisease.setCommonName(request.commonName());
        existingDisease.setDiseaseType(request.diseaseType());
        existingDisease.setSymptoms(request.symptoms());
        existingDisease.setPreventionMeasures(request.preventionMeasures());
        existingDisease.setTreatmentMethods(request.treatmentMethods());
        existingDisease.setRiskLevel(request.riskLevel());
        existingDisease.setActiveSeason(request.activeSeason());
        existingDisease.setFavorableConditions(request.favorableConditions());
        existingDisease.setImageUrl(request.imageUrl());
        existingDisease.setIsActive(request.isActive() != null ? request.isActive() : true);

        // Обновляем affectedCrops
        if (request.affectedCropIds() != null) {
            Set<CropType> affectedCrops = new HashSet<>(
                    cropTypeRepository.findAllById(request.affectedCropIds())
            );
            existingDisease.setAffectedCrops(affectedCrops);
        } else {
            existingDisease.setAffectedCrops(new HashSet<>());
        }

        Disease updatedDisease = diseaseRepository.save(existingDisease);
        log.info("Updated disease with id: {}", updatedDisease.getId());
        return diseaseMapper.toResponse(updatedDisease);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Disease disease = diseaseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Disease not found with id: " + id));

        // Check if disease has related resistances
        if (diseaseRepository.hasDiseaseResistances(id)) {
            throw new ConflictException("Cannot delete disease with id: " + id + " because it has related disease resistances");
        }

        diseaseRepository.delete(disease);
        log.info("Deleted disease with id: {}", id);
    }
}
