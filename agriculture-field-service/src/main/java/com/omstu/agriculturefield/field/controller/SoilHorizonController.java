package com.omstu.agriculturefield.field.controller;

import com.omstu.agriculturefield.field.dto.SoilHorizonRequest;
import com.omstu.agriculturefield.field.dto.SoilHorizonResponse;
import com.omstu.agriculturefield.field.service.SoilHorizonService;
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
@RequestMapping("/api/soil-horizons")
@RequiredArgsConstructor
@Slf4j
public class SoilHorizonController {

    private final SoilHorizonService soilHorizonService;

    @GetMapping
    public List<SoilHorizonResponse> getByField(@RequestParam Long fieldId) {
        log.info("Fetching soil horizons for field id={}", fieldId);
        return soilHorizonService.getByFieldId(fieldId);
    }

    @GetMapping("/{id}")
    public SoilHorizonResponse getById(@PathVariable Long id) {
        log.info("Fetching soil horizon id={}", id);
        return soilHorizonService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SoilHorizonResponse create(@Valid @RequestBody SoilHorizonRequest request) {
        log.info("Creating soil horizon for field id={}", request.fieldId());
        return soilHorizonService.create(request);
    }

    @PutMapping("/{id}")
    public SoilHorizonResponse update(@PathVariable Long id, @Valid @RequestBody SoilHorizonRequest request) {
        log.info("Updating soil horizon id={}", id);
        return soilHorizonService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        log.info("Deleting soil horizon id={}", id);
        soilHorizonService.delete(id);
    }
}
