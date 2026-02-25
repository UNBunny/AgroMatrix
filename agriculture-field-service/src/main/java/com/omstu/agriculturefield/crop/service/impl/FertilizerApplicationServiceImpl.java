package com.omstu.agriculturefield.crop.service.impl;

import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.crop.dto.FertilizerApplicationRequest;
import com.omstu.agriculturefield.crop.dto.FertilizerApplicationResponse;
import com.omstu.agriculturefield.crop.mapper.FertilizerApplicationMapper;
import com.omstu.agriculturefield.crop.model.CropHistory;
import com.omstu.agriculturefield.crop.model.FertilizerApplication;
import com.omstu.agriculturefield.crop.repository.CropHistoryRepository;
import com.omstu.agriculturefield.crop.repository.FertilizerApplicationRepository;
import com.omstu.agriculturefield.crop.service.FertilizerApplicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class FertilizerApplicationServiceImpl implements FertilizerApplicationService {

    private final FertilizerApplicationRepository repository;
    private final FertilizerApplicationMapper mapper;
    private final CropHistoryRepository cropHistoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<FertilizerApplicationResponse> getByCropHistoryId(Long cropHistoryId) {
        return repository.findByCropHistoryIdOrderByApplicationDateAsc(cropHistoryId)
                .stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public FertilizerApplicationResponse getById(Long id) {
        return repository.findById(id)
                .map(mapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Fertilizer application not found with id: " + id));
    }

    @Override
    @Transactional
    public FertilizerApplicationResponse create(FertilizerApplicationRequest request) {
        CropHistory cropHistory = cropHistoryRepository.findById(request.cropHistoryId())
                .orElseThrow(() -> new NotFoundException("Crop history not found with id: " + request.cropHistoryId()));

        FertilizerApplication entity = mapper.toEntity(request);
        entity.setCropHistory(cropHistory);

        FertilizerApplication saved = repository.save(entity);
        log.info("Created fertilizer application id={} for crop history id={}", saved.getId(), cropHistory.getId());
        return mapper.toResponse(saved);
    }

    @Override
    @Transactional
    public FertilizerApplicationResponse update(Long id, FertilizerApplicationRequest request) {
        FertilizerApplication existing = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Fertilizer application not found with id: " + id));

        CropHistory cropHistory = cropHistoryRepository.findById(request.cropHistoryId())
                .orElseThrow(() -> new NotFoundException("Crop history not found with id: " + request.cropHistoryId()));

        mapper.updateEntity(request, existing);
        existing.setCropHistory(cropHistory);

        FertilizerApplication updated = repository.save(existing);
        log.info("Updated fertilizer application id={}", updated.getId());
        return mapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        FertilizerApplication entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Fertilizer application not found with id: " + id));
        repository.delete(entity);
        log.info("Deleted fertilizer application id={}", id);
    }
}
