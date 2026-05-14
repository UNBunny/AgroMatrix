package com.omstu.agriculturefield.protection.controller;

import com.omstu.agriculturefield.protection.dto.CropProtectionEntryDto;
import com.omstu.agriculturefield.protection.dto.CropProtectionEntryRequest;
import com.omstu.agriculturefield.protection.service.CatalogCrudService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * CRUD API for the crop protection catalog.
 *
 * GET    /api/protection/catalog        — list all entries
 * GET    /api/protection/catalog/{id}   — get one entry
 * POST   /api/protection/catalog        — create entry
 * PUT    /api/protection/catalog/{id}   — update entry
 * DELETE /api/protection/catalog/{id}   — delete entry
 */
@RestController
@RequestMapping("/api/protection/catalog")
@RequiredArgsConstructor
public class CatalogCrudController {

    private final CatalogCrudService service;

    @GetMapping
    public List<CropProtectionEntryDto> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public CropProtectionEntryDto getById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<CropProtectionEntryDto> create(@Valid @RequestBody CropProtectionEntryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public CropProtectionEntryDto update(@PathVariable Long id,
                                         @Valid @RequestBody CropProtectionEntryRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
