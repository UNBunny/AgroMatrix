package com.omstu.agriculturefield.report.service;

import com.omstu.agriculturefield.common.exception.ForbiddenException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import com.omstu.agriculturefield.report.dto.PlanReviewRequest;
import com.omstu.agriculturefield.report.dto.SeasonPlanRequest;
import com.omstu.agriculturefield.report.dto.SeasonPlanResponse;
import com.omstu.agriculturefield.report.model.SeasonPlan;
import com.omstu.agriculturefield.report.model.enums.PlanStatus;
import com.omstu.agriculturefield.report.repository.SeasonPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanService {

    private final SeasonPlanRepository planRepository;
    private final AgriculturalFieldRepository fieldRepository;
    private final AuditLogService auditLogService;

    private SeasonPlanResponse toResponse(SeasonPlan p) {
        return new SeasonPlanResponse(
                p.getId(),
                p.getField().getId(),
                p.getField().getFieldName(),
                p.getCropType(),
                p.getSeason(),
                p.getDescription(),
                p.getStatus(),
                p.getCreatedByUserId(),
                p.getCreatedByUsername(),
                p.getReviewedByUserId(),
                p.getReviewedByUsername(),
                p.getReviewComment(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }

    public List<SeasonPlanResponse> getPlans(Long farmId, PlanStatus status, Long fieldId) {
        if (status != null) {
            return planRepository.findAllByFarmIdAndStatusOrderByCreatedAtDesc(farmId, status)
                    .stream().map(this::toResponse).toList();
        }
        if (fieldId != null) {
            return planRepository.findAllByFarmIdAndField_IdOrderByCreatedAtDesc(farmId, fieldId)
                    .stream().map(this::toResponse).toList();
        }
        return planRepository.findAllByFarmIdOrderByCreatedAtDesc(farmId)
                .stream().map(this::toResponse).toList();
    }

    public SeasonPlanResponse getPlanById(Long id, Long farmId) {
        SeasonPlan plan = planRepository.findById(id)
                .filter(p -> farmId == null || farmId.equals(p.getFarmId()))
                .orElseThrow(() -> new NotFoundException("Plan not found: " + id));
        return toResponse(plan);
    }

    @Transactional
    public SeasonPlanResponse createPlan(SeasonPlanRequest req, Long farmId, Long userId, String username) {
        AgriculturalField field = fieldRepository.findById(req.fieldId())
                .orElseThrow(() -> new NotFoundException("Field not found: " + req.fieldId()));

        SeasonPlan plan = SeasonPlan.builder()
                .field(field)
                .cropType(req.cropType())
                .season(req.season())
                .description(req.description())
                .status(PlanStatus.DRAFT)
                .farmId(farmId)
                .createdByUserId(userId)
                .createdByUsername(username)
                .build();

        plan = planRepository.save(plan);

        auditLogService.log("PLAN", plan.getId(), "CREATE", userId, username,
                field.getId(), field.getFieldName(), null, null,
                String.format("cropType=%s, season=%s", req.cropType(), req.season()));

        return toResponse(plan);
    }

    @Transactional
    public SeasonPlanResponse submitForApproval(Long id, Long farmId, Long userId, String username, String role) {
        if (!"AGRONOMIST".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            throw new ForbiddenException("Только агроном может отправить план на утверждение");
        }

        SeasonPlan plan = planRepository.findById(id)
                .filter(p -> farmId == null || farmId.equals(p.getFarmId()))
                .orElseThrow(() -> new NotFoundException("Plan not found: " + id));

        if (plan.getStatus() != PlanStatus.DRAFT) {
            throw new ValidationException("Only DRAFT plans can be submitted");
        }

        plan.setStatus(PlanStatus.PENDING_APPROVAL);
        plan = planRepository.save(plan);

        auditLogService.log("PLAN", plan.getId(), "SUBMIT", userId, username,
                plan.getField().getId(), plan.getField().getFieldName(),
                "status", "DRAFT", "PENDING_APPROVAL");

        return toResponse(plan);
    }

    @Transactional
    public SeasonPlanResponse reviewPlan(Long id, PlanReviewRequest req, Long farmId, Long userId, String username, String role) {
        if (!"DIRECTOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            throw new ForbiddenException("Только руководитель может утверждать или отклонять план");
        }

        SeasonPlan plan = planRepository.findById(id)
                .filter(p -> farmId == null || farmId.equals(p.getFarmId()))
                .orElseThrow(() -> new NotFoundException("Plan not found: " + id));

        if (plan.getStatus() != PlanStatus.PENDING_APPROVAL) {
            throw new ValidationException("Only PENDING_APPROVAL plans can be reviewed");
        }
        if (req.status() != PlanStatus.APPROVED && req.status() != PlanStatus.REJECTED) {
            throw new ValidationException("Review status must be APPROVED or REJECTED");
        }

        String oldStatus = plan.getStatus().name();
        plan.setStatus(req.status());
        plan.setReviewedByUserId(userId);
        plan.setReviewedByUsername(username);
        plan.setReviewComment(req.comment());
        plan = planRepository.save(plan);

        auditLogService.log("PLAN", plan.getId(), req.status().name(), userId, username,
                plan.getField().getId(), plan.getField().getFieldName(),
                "status", oldStatus, req.status().name());

        return toResponse(plan);
    }
}
