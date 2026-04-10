package com.omstu.agriculturefield.crop.controller;

import com.omstu.agriculturefield.crop.dto.FertilizerApplicationRequest;
import com.omstu.agriculturefield.crop.dto.FertilizerApplicationResponse;
import com.omstu.agriculturefield.crop.service.FertilizerApplicationService;
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
@RequestMapping("/api/fertilizer-applications")
@RequiredArgsConstructor
@Slf4j
public class FertilizerApplicationController {

    private final FertilizerApplicationService service;

    @GetMapping
    public List<FertilizerApplicationResponse> getByCropHistory(@RequestParam Long cropHistoryId) {
        log.info("Fetching fertilizer applications for cropHistoryId={}", cropHistoryId);
        return service.getByCropHistoryId(cropHistoryId);
    }

    @GetMapping("/{id}")
    public FertilizerApplicationResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FertilizerApplicationResponse create(@Valid @RequestBody FertilizerApplicationRequest request) {
        log.info("Creating fertilizer application for cropHistoryId={}", request.cropHistoryId());
        return service.create(request);
    }

    @PutMapping("/{id}")
    public FertilizerApplicationResponse update(@PathVariable Long id,
                                                 @Valid @RequestBody FertilizerApplicationRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
