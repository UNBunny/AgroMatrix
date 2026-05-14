package com.omstu.agriculturefield.crop.service.impl;

import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.crop.dto.PlantProtectionRequest;
import com.omstu.agriculturefield.crop.dto.PlantProtectionResponse;
import com.omstu.agriculturefield.crop.mapper.PlantProtectionMapper;
import com.omstu.agriculturefield.crop.model.CropHistory;
import com.omstu.agriculturefield.crop.model.PlantProtectionOperation;
import com.omstu.agriculturefield.crop.repository.CropHistoryRepository;
import com.omstu.agriculturefield.crop.repository.PlantProtectionRepository;
import com.omstu.agriculturefield.crop.service.PlantProtectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PlantProtectionServiceImpl implements PlantProtectionService {

    private final PlantProtectionRepository repository;
    private final PlantProtectionMapper mapper;
    private final CropHistoryRepository cropHistoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PlantProtectionResponse> getByCropHistoryId(Long cropHistoryId) {
        return repository.findByCropHistoryIdOrderByOperationDateAsc(cropHistoryId)
                .stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PlantProtectionResponse getById(Long id) {
        return repository.findById(id)
                .map(mapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Plant protection operation not found with id: " + id));
    }

    @Override
    @Transactional
    public PlantProtectionResponse create(PlantProtectionRequest request) {
        CropHistory cropHistory = cropHistoryRepository.findById(request.cropHistoryId())
                .orElseThrow(() -> new NotFoundException("Crop history not found with id: " + request.cropHistoryId()));

        PlantProtectionOperation entity = mapper.toEntity(request);
        entity.setCropHistory(cropHistory);

        PlantProtectionOperation saved = repository.save(entity);
        log.info("Created plant protection operation id={} for crop history id={}", saved.getId(), cropHistory.getId());
        return mapper.toResponse(saved);
    }

    @Override
    @Transactional
    public PlantProtectionResponse update(Long id, PlantProtectionRequest request) {
        PlantProtectionOperation existing = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Plant protection operation not found with id: " + id));

        CropHistory cropHistory = cropHistoryRepository.findById(request.cropHistoryId())
                .orElseThrow(() -> new NotFoundException("Crop history not found with id: " + request.cropHistoryId()));

        mapper.updateEntity(request, existing);
        existing.setCropHistory(cropHistory);

        PlantProtectionOperation updated = repository.save(existing);
        log.info("Updated plant protection operation id={}", updated.getId());
        return mapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        PlantProtectionOperation entity = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Plant protection operation not found with id: " + id));
        repository.delete(entity);
        log.info("Deleted plant protection operation id={}", id);
    }
}
