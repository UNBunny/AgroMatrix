package com.omstu.agriculturefield.field.controller;

import com.omstu.agriculturefield.field.dto.AgriculturalFieldRequest;
import com.omstu.agriculturefield.field.dto.AgriculturalFieldResponse;
import com.omstu.agriculturefield.field.service.FieldService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/fields")
@RequiredArgsConstructor
@Slf4j
public class AgriculturalFieldController {
    private final FieldService fieldService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AgriculturalFieldResponse createField(
            @Valid @RequestBody AgriculturalFieldRequest request,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId
    ) {
        log.info("Agricultural field creation requested, farmId={}", farmId);
        return fieldService.createField(request, farmId);
    }

    @GetMapping
    public List<AgriculturalFieldResponse> getAllFields(
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId
    ) {
        log.info("Fetching all agricultural fields, farmId={}", farmId);
        return fieldService.getAllFields(farmId);
    }

    @GetMapping("/{id}")
    public AgriculturalFieldResponse getFieldById(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId
    ) {
        log.info("Fetching agricultural field with ID: {}, farmId={}", id, farmId);
        return fieldService.getFieldById(id, farmId);
    }

    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public AgriculturalFieldResponse updateField(
            @PathVariable Long id,
            @Valid @RequestBody AgriculturalFieldRequest request,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId
    ) {
        log.info("Updating agricultural field with ID: {}, farmId={}", id, farmId);
        return fieldService.updateField(id, request, farmId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteField(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Farm-Id", required = false) Long farmId
    ) {
        log.info("Deleting agricultural field with ID: {}, farmId={}", id, farmId);
        fieldService.deleteField(id, farmId);
    }

}
