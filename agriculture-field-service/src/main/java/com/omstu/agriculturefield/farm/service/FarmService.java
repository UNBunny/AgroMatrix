package com.omstu.agriculturefield.farm.service;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.farm.dto.FarmCreateRequest;
import com.omstu.agriculturefield.farm.dto.FarmResponse;
import com.omstu.agriculturefield.farm.model.Farm;
import com.omstu.agriculturefield.farm.repository.FarmRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FarmService {

    private final FarmRepository farmRepository;

    @Transactional
    public FarmResponse createFarm(FarmCreateRequest request, Long ownerId) {
        if (farmRepository.existsByOwnerId(ownerId)) {
            throw new ConflictException("У вас уже есть хозяйство");
        }
        String inviteCode = generateInviteCode();
        Farm farm = Farm.builder()
                .name(request.name())
                .description(request.description())
                .inviteCode(inviteCode)
                .ownerId(ownerId)
                .inn(request.inn())
                .kpp(request.kpp())
                .ogrn(request.ogrn())
                .region(request.region())
                .address(request.address())
                .build();
        farm = farmRepository.save(farm);
        log.info("Farm created: id={}, owner={}", farm.getId(), ownerId);
        return toResponse(farm);
    }

    @Transactional(readOnly = true)
    public FarmResponse joinFarm(String inviteCode) {
        Farm farm = farmRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new NotFoundException("Хозяйство с таким кодом не найдено"));
        return toResponse(farm);
    }

    @Transactional(readOnly = true)
    public FarmResponse getFarmById(Long id) {
        Farm farm = farmRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Хозяйство не найдено"));
        return toResponse(farm);
    }

    @Transactional
    public String regenerateInviteCode(Long farmId, Long requesterId) {
        Farm farm = farmRepository.findById(farmId)
                .orElseThrow(() -> new NotFoundException("Хозяйство не найдено"));
        if (!farm.getOwnerId().equals(requesterId)) {
            throw new com.omstu.agriculturefield.common.exception.ValidationException("Только владелец может обновить код");
        }
        farm.setInviteCode(generateInviteCode());
        farmRepository.save(farm);
        return farm.getInviteCode();
    }

    private String generateInviteCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private FarmResponse toResponse(Farm farm) {
        return new FarmResponse(
                farm.getId(),
                farm.getName(),
                farm.getDescription(),
                farm.getInviteCode(),
                farm.getOwnerId(),
                farm.getInn(),
                farm.getKpp(),
                farm.getOgrn(),
                farm.getRegion(),
                farm.getAddress(),
                farm.getCreatedAt()
        );
    }
}
