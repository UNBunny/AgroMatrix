package com.omstu.agriculturefield.farm.controller;

import com.omstu.agriculturefield.farm.dto.FarmCreateRequest;
import com.omstu.agriculturefield.farm.dto.FarmResponse;
import com.omstu.agriculturefield.farm.service.FarmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/farms")
@RequiredArgsConstructor
public class FarmController {

    private final FarmService farmService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FarmResponse createFarm(
            @Valid @RequestBody FarmCreateRequest request,
            @RequestHeader("X-Auth-User-Id") Long userId
    ) {
        return farmService.createFarm(request, userId);
    }

    @PostMapping("/join")
    public FarmResponse joinFarm(@RequestParam String inviteCode) {
        return farmService.joinFarm(inviteCode);
    }

    @GetMapping("/{id}")
    public FarmResponse getFarm(@PathVariable Long id) {
        return farmService.getFarmById(id);
    }

    @PostMapping("/{id}/regenerate-invite")
    public Map<String, String> regenerateInvite(
            @PathVariable Long id,
            @RequestHeader("X-Auth-User-Id") Long userId
    ) {
        String newCode = farmService.regenerateInviteCode(id, userId);
        return Map.of("inviteCode", newCode);
    }
}
