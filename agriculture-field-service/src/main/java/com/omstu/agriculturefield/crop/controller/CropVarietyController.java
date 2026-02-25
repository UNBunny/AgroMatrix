package com.omstu.agriculturefield.crop.controller;

import com.omstu.agriculturefield.crop.dto.CropVarietyRequest;
import com.omstu.agriculturefield.crop.dto.CropVarietyResponse;
import com.omstu.agriculturefield.common.service.BaseService;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/crop-variety")
@RequiredArgsConstructor
@Slf4j
public class CropVarietyController {
    private final BaseService<CropVarietyRequest, CropVarietyResponse, Long> cropVarietyService;

    @GetMapping
    public List<CropVarietyResponse> getAllCropVarieties() {
        log.info("Fetching all crop varieties");
        return cropVarietyService.getAll();
    }

    @GetMapping("/{id}")
    public CropVarietyResponse getCropVarietyById(@PathVariable Long id) {
        log.info("Fetching crop variety id={}", id);
        return cropVarietyService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CropVarietyResponse createCropVariety(@Valid @RequestBody CropVarietyRequest cropVarietyRequest) {
        log.info("Creating crop variety name={}", cropVarietyRequest.name());
        return cropVarietyService.create(cropVarietyRequest);
    }

    @PutMapping("/{id}")
    public CropVarietyResponse updateCropVariety(@PathVariable Long id, @Valid @RequestBody CropVarietyRequest cropVarietyRequest) {
        log.info("Updating crop variety id={}", id);
        return cropVarietyService.update(id, cropVarietyRequest);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCropVariety(@PathVariable Long id) {
        log.info("Deleting crop variety id={}", id);
        cropVarietyService.delete(id);
    }
}
