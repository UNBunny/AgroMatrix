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
            @Valid @RequestBody AgriculturalFieldRequest request
    ) {
        log.info("Agricultural field creation requested");
        return fieldService.createField(request);
    }

    @GetMapping
    public List<AgriculturalFieldResponse> getAllFields() {
        log.info("Fetching all agricultural fields");
        return fieldService.getAllFields();
    }

    @GetMapping("/{id}")
    public AgriculturalFieldResponse getFieldById(@PathVariable Long id) {
        log.info("Fetching agricultural field with ID: {}", id);
        return fieldService.getFieldById(id);
    }

    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public AgriculturalFieldResponse updateField(
            @PathVariable Long id,
            @Valid @RequestBody AgriculturalFieldRequest request
    ) {
        log.info("Updating agricultural field with ID: {}", id);
        return fieldService.updateField(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteField(@PathVariable Long id) {
        log.info("Deleting agricultural field with ID: {}", id);
        fieldService.deleteField(id);
    }

}
