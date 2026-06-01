package com.omstu.agriculturefield.farm.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "farms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Farm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "invite_code", nullable = false, unique = true, length = 32)
    private String inviteCode;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(length = 12)
    private String inn;

    @Column(length = 9)
    private String kpp;

    @Column(length = 15)
    private String ogrn;

    @Column(length = 255)
    private String region;

    @Column(length = 500)
    private String address;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
