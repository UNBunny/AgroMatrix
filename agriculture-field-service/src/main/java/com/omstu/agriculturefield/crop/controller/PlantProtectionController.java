package com.omstu.agriculturefield.crop.controller;

import com.omstu.agriculturefield.crop.dto.PlantProtectionRequest;
import com.omstu.agriculturefield.crop.dto.PlantProtectionResponse;
import com.omstu.agriculturefield.crop.service.PlantProtectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/plant-protection")
@RequiredArgsConstructor
@Slf4j
public class PlantProtectionController {

    private final PlantProtectionService service;

    @GetMapping
    public List<PlantProtectionResponse> getByCropHistory(@RequestParam Long cropHistoryId) {
        log.info("Fetching plant protection operations for cropHistoryId={}", cropHistoryId);
        return service.getByCropHistoryId(cropHistoryId);
    }

    @GetMapping("/{id}")
    public PlantProtectionResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlantProtectionResponse create(@Valid @RequestBody PlantProtectionRequest request) {
        log.info("Creating plant protection operation for cropHistoryId={}", request.cropHistoryId());
        return service.create(request);
    }

    @PutMapping("/{id}")
    public PlantProtectionResponse update(@PathVariable Long id,
                                           @Valid @RequestBody PlantProtectionRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
