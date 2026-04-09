package com.omstu.agriculturefield.crop.controller;

import com.omstu.agriculturefield.crop.dto.PhenologicalObservationRequest;
import com.omstu.agriculturefield.crop.dto.PhenologicalObservationResponse;
import com.omstu.agriculturefield.crop.service.PhenologicalObservationService;
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
@RequestMapping("/api/phenological-observations")
@RequiredArgsConstructor
@Slf4j
public class PhenologicalObservationController {

    private final PhenologicalObservationService service;

    @GetMapping
    public List<PhenologicalObservationResponse> getByCropHistory(@RequestParam Long cropHistoryId) {
        log.info("Fetching phenological observations for cropHistoryId={}", cropHistoryId);
        return service.getByCropHistoryId(cropHistoryId);
    }

    @GetMapping("/{id}")
    public PhenologicalObservationResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PhenologicalObservationResponse create(@Valid @RequestBody PhenologicalObservationRequest request) {
        log.info("Creating phenological observation for cropHistoryId={}", request.cropHistoryId());
        return service.create(request);
    }

    @PutMapping("/{id}")
    public PhenologicalObservationResponse update(@PathVariable Long id,
                                                   @Valid @RequestBody PhenologicalObservationRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
