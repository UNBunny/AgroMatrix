package com.omstu.authservice.controller;

import com.omstu.authservice.dto.*;
import com.omstu.authservice.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/join")
    public ResponseEntity<AuthResponse> join(
            @Valid @RequestBody JoinByCodeRequest request,
            @RequestParam Long farmId
    ) {
        return ResponseEntity.ok(authService.joinByCode(request, farmId));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request) {
        String refreshToken = extractCookie(request, "refresh_token");
        if (refreshToken == null) {
            return ResponseEntity.status(401).body(null);
        }
        return ResponseEntity.ok(authService.refresh(refreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        String refreshToken = extractCookie(request, "refresh_token");
        authService.logout(refreshToken);
        return ResponseEntity.ok(Map.of("message", "Выход выполнен"));
    }

    @PostMapping("/switch-farm/{farmId}")
    public ResponseEntity<AuthResponse> switchFarm(
            @PathVariable Long farmId,
            @RequestHeader("X-Auth-User") String username
    ) {
        return ResponseEntity.ok(authService.switchFarm(username, farmId));
    }

    @PostMapping("/assign-farm")
    public ResponseEntity<Void> assignFarm(
            @RequestBody Map<String, Long> body,
            @RequestHeader("X-Auth-User") String username
    ) {
        authService.assignFarm(username, body.get("farmId"));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserInfoResponse> me(@RequestHeader("X-Auth-User") String username) {
        return ResponseEntity.ok(authService.getCurrentUser(username));
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
