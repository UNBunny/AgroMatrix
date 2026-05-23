package com.omstu.agriculturefield.farm.service;

import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.farm.dto.FarmResponse;
import com.omstu.agriculturefield.farm.model.Farm;
import com.omstu.agriculturefield.farm.repository.FarmRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FarmAdminService {

    private final FarmRepository farmRepository;

    public List<FarmResponse> getAllFarms() {
        return farmRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deleteFarm(Long id) {
        Farm farm = farmRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Хозяйство не найдено"));
        farmRepository.delete(farm);
        log.info("Farm deleted by admin: id={}, name={}", id, farm.getName());
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
