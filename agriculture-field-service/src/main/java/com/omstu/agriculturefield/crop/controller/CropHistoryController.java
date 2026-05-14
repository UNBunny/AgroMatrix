package com.omstu.agriculturefield.crop.controller;

import com.omstu.agriculturefield.common.service.BaseService;
import com.omstu.agriculturefield.crop.dto.CropHistoryRequest;
import com.omstu.agriculturefield.crop.dto.CropHistoryResponse;
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
@RequestMapping("/api/crop-histories")
@RequiredArgsConstructor
@Slf4j
public class CropHistoryController {

    private final BaseService<CropHistoryRequest, CropHistoryResponse, Long> cropHistoryService;

    @GetMapping
    public List<CropHistoryResponse> getAllCropHistories() {
        log.info("Fetching all crop histories");
        return cropHistoryService.getAll();
    }

    @GetMapping("/{id}")
    public CropHistoryResponse getCropHistoryById(@PathVariable Long id) {
        log.info("Fetching crop history id={}", id);
        return cropHistoryService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CropHistoryResponse createCropHistory(@Valid @RequestBody CropHistoryRequest request) {
        log.info("Creating crop history fieldId={}, cropTypeId={}", request.fieldId(), request.cropTypeId());
        return cropHistoryService.create(request);
    }

    @PutMapping("/{id}")
    public CropHistoryResponse updateCropHistory(@PathVariable Long id, @Valid @RequestBody CropHistoryRequest request) {
        log.info("Updating crop history id={}", id);
        return cropHistoryService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCropHistory(@PathVariable Long id) {
        log.info("Deleting crop history id={}", id);
        cropHistoryService.delete(id);
    }
}
