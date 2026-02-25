package com.omstu.agriculturefield.crop.controller;

import com.omstu.agriculturefield.crop.dto.CropTypeRequest;
import com.omstu.agriculturefield.crop.dto.CropTypeResponse;
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
@RequestMapping("/api/crop-type")
@RequiredArgsConstructor
@Slf4j
public class CropTypeController {

    private final BaseService<CropTypeRequest, CropTypeResponse, Long> cropTypeService;

    @GetMapping
    public List<CropTypeResponse> getAllCropTypes() {
        log.info("Fetching all crop types");
        return cropTypeService.getAll();
    }

    @GetMapping("/{id}")
    public CropTypeResponse getCropTypeById(@PathVariable Long id) {
        log.info("Fetching crop type id={}", id);
        return cropTypeService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CropTypeResponse createCropType(@Valid @RequestBody CropTypeRequest request) {
        log.info("Creating crop type name={}", request.name());
        return cropTypeService.create(request);
    }

    @PutMapping("/{id}")
    public CropTypeResponse updateCropType(@PathVariable Long id, @Valid @RequestBody CropTypeRequest request) {
        log.info("Updating crop type id={}", id);
        return cropTypeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCropType(@PathVariable Long id) {
        log.info("Deleting crop type id={}", id);
        cropTypeService.delete(id);
    }
}
