package com.omstu.agriculturefield.report.model;

import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.report.model.enums.PlanStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "season_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeasonPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    private AgriculturalField field;

    @Column(nullable = false)
    private String cropType;

    @Column(nullable = false)
    private String season;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlanStatus status;

    @Column(nullable = false)
    private Long createdByUserId;

    @Column(nullable = false)
    private String createdByUsername;

    private Long reviewedByUserId;

    private String reviewedByUsername;

    @Column(columnDefinition = "TEXT")
    private String reviewComment;

    private Long farmId;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
