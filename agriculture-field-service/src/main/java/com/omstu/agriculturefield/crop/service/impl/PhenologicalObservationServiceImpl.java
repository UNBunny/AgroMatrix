package com.omstu.agriculturefield.crop.service.impl;

import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.crop.dto.PhenologicalObservationRequest;
import com.omstu.agriculturefield.crop.dto.PhenologicalObservationResponse;
import com.omstu.agriculturefield.crop.mapper.PhenologicalObservationMapper;
import com.omstu.agriculturefield.crop.model.CropHistory;
import com.omstu.agriculturefield.crop.model.PhenologicalObservation;
import com.omstu.agriculturefield.crop.repository.CropHistoryRepository;
import com.omstu.agriculturefield.crop.repository.PhenologicalObservationRepository;
import com.omstu.agriculturefield.crop.service.PhenologicalObservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PhenologicalObservationServiceImpl implements PhenologicalObservationService {

    private final PhenologicalObservationRepository observationRepository;
    private final PhenologicalObservationMapper observationMapper;
    private final CropHistoryRepository cropHistoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PhenologicalObservationResponse> getByCropHistoryId(Long cropHistoryId) {
        return observationRepository.findByCropHistoryIdOrderByObservationDateAsc(cropHistoryId)
                .stream()
                .map(observationMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PhenologicalObservationResponse getById(Long id) {
        return observationRepository.findById(id)
                .map(observationMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Phenological observation not found with id: " + id));
    }

    @Override
    @Transactional
    public PhenologicalObservationResponse create(PhenologicalObservationRequest request) {
        CropHistory cropHistory = cropHistoryRepository.findById(request.cropHistoryId())
                .orElseThrow(() -> new NotFoundException("Crop history not found with id: " + request.cropHistoryId()));

        PhenologicalObservation observation = observationMapper.toEntity(request);
        observation.setCropHistory(cropHistory);

        PhenologicalObservation saved = observationRepository.save(observation);
        log.info("Created phenological observation id={} for crop history id={}", saved.getId(), cropHistory.getId());
        return observationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public PhenologicalObservationResponse update(Long id, PhenologicalObservationRequest request) {
        PhenologicalObservation existing = observationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Phenological observation not found with id: " + id));

        CropHistory cropHistory = cropHistoryRepository.findById(request.cropHistoryId())
                .orElseThrow(() -> new NotFoundException("Crop history not found with id: " + request.cropHistoryId()));

        observationMapper.updateEntity(request, existing);
        existing.setCropHistory(cropHistory);

        PhenologicalObservation updated = observationRepository.save(existing);
        log.info("Updated phenological observation id={}", updated.getId());
        return observationMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        PhenologicalObservation observation = observationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Phenological observation not found with id: " + id));
        observationRepository.delete(observation);
        log.info("Deleted phenological observation id={}", id);
    }
}
