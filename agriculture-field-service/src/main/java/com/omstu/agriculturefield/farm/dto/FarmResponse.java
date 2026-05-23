package com.omstu.agriculturefield.farm.dto;

import java.time.LocalDateTime;

public record FarmResponse(
        Long id,
        String name,
        String description,
        String inviteCode,
        Long ownerId,
        String inn,
        String kpp,
        String ogrn,
        String region,
        String address,
        LocalDateTime createdAt
) {}
