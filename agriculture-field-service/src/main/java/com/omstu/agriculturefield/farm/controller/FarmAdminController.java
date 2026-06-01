package com.omstu.agriculturefield.farm.controller;

import com.omstu.agriculturefield.farm.dto.FarmResponse;
import com.omstu.agriculturefield.farm.service.FarmAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/farms")
@RequiredArgsConstructor
public class FarmAdminController {

    private final FarmAdminService farmAdminService;

    @GetMapping
    public ResponseEntity<List<FarmResponse>> getAllFarms() {
        return ResponseEntity.ok(farmAdminService.getAllFarms());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFarm(@PathVariable Long id) {
        farmAdminService.deleteFarm(id);
        return ResponseEntity.noContent().build();
    }
}
