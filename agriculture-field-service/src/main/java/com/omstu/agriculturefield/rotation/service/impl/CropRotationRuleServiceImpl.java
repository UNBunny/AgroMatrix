package com.omstu.agriculturefield.rotation.service.impl;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.crop.model.CropType;
import com.omstu.agriculturefield.crop.repository.CropTypeRepository;
import com.omstu.agriculturefield.rotation.dto.CropRotationRuleRequest;
import com.omstu.agriculturefield.rotation.dto.CropRotationRuleResponse;
import com.omstu.agriculturefield.rotation.mapper.CropRotationRuleMapper;
import com.omstu.agriculturefield.rotation.model.CropRotationRule;
import com.omstu.agriculturefield.rotation.model.enums.RotationRecommendation;
import com.omstu.agriculturefield.rotation.repository.CropRotationRuleRepository;
import com.omstu.agriculturefield.rotation.service.CropRotationRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class CropRotationRuleServiceImpl implements CropRotationRuleService {

    private static final List<RotationRecommendation> POSITIVE_RECOMMENDATIONS = List.of(
            RotationRecommendation.STRONGLY_RECOMMENDED,
            RotationRecommendation.RECOMMENDED,
            RotationRecommendation.ACCEPTABLE
    );

    private final CropRotationRuleRepository cropRotationRuleRepository;
    private final CropRotationRuleMapper cropRotationRuleMapper;
    private final CropTypeRepository cropTypeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CropRotationRuleResponse> getAll() {
        return cropRotationRuleRepository.findAll()
                .stream()
                .map(cropRotationRuleMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CropRotationRuleResponse getById(Long id) {
        return cropRotationRuleRepository.findById(id)
                .map(cropRotationRuleMapper::toResponse)
                .orElseThrow(() -> new NotFoundException("Crop rotation rule not found with id: " + id));
    }

    @Override
    @Transactional
    public CropRotationRuleResponse create(CropRotationRuleRequest request) {
        validateCropRotationRuleRequest(request, null);

        CropType predecessor = cropTypeRepository.findById(request.predecessorCropId())
                .orElseThrow(() -> new NotFoundException("Predecessor crop type not found with id: " + request.predecessorCropId()));
        CropType successor = cropTypeRepository.findById(request.successorCropId())
                .orElseThrow(() -> new NotFoundException("Successor crop type not found with id: " + request.successorCropId()));

        if (cropRotationRuleRepository.existsByPredecessorCropIdAndSuccessorCropId(
                request.predecessorCropId(), request.successorCropId())) {
            throw new ConflictException("Rotation rule for this predecessor-successor pair already exists");
        }

        CropRotationRule rule = cropRotationRuleMapper.toEntity(request);
        rule.setPredecessorCrop(predecessor);
        rule.setSuccessorCrop(successor);

        CropRotationRule saved = cropRotationRuleRepository.save(rule);
        log.info("Created crop rotation rule with id: {}", saved.getId());
        return cropRotationRuleMapper.toResponse(saved);
    }

    private void validateCropRotationRuleRequest(CropRotationRuleRequest request, Long existingId) {
        if (request.predecessorCropId().equals(request.successorCropId())) {
            throw new ValidationException("Predecessor and successor crop types cannot be the same");
        }
        if (request.minGapYears() != null && request.minGapYears() < 0) {
            throw new ValidationException("Minimum gap years cannot be negative");
        }
    }

    @Override
    @Transactional
    public CropRotationRuleResponse update(Long id, CropRotationRuleRequest request) {
        validateCropRotationRuleRequest(request, id);

        CropRotationRule existing = cropRotationRuleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Crop rotation rule not found with id: " + id));

        CropType predecessor = cropTypeRepository.findById(request.predecessorCropId())
                .orElseThrow(() -> new NotFoundException("Predecessor crop type not found with id: " + request.predecessorCropId()));
        CropType successor = cropTypeRepository.findById(request.successorCropId())
                .orElseThrow(() -> new NotFoundException("Successor crop type not found with id: " + request.successorCropId()));

        cropRotationRuleMapper.updateEntity(request, existing);
        existing.setPredecessorCrop(predecessor);
        existing.setSuccessorCrop(successor);

        CropRotationRule updated = cropRotationRuleRepository.save(existing);
        log.info("Updated crop rotation rule with id: {}", updated.getId());
        return cropRotationRuleMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        CropRotationRule rule = cropRotationRuleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Crop rotation rule not found with id: " + id));
        cropRotationRuleRepository.delete(rule);
        log.info("Deleted crop rotation rule with id: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CropRotationRuleResponse> findByPredecessorCropId(Long predecessorCropId) {
        return cropRotationRuleRepository.findByPredecessorCropId(predecessorCropId)
                .stream()
                .map(cropRotationRuleMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CropRotationRuleResponse> findAllowedByPredecessorCropId(Long predecessorCropId) {
        return cropRotationRuleRepository.findAllowedByPredecessorCropId(predecessorCropId, POSITIVE_RECOMMENDATIONS)
                .stream()
                .map(cropRotationRuleMapper::toResponse)
                .collect(Collectors.toList());
    }
}