package com.omstu.authservice.controller;

import com.omstu.authservice.dto.UserAdminResponse;
import com.omstu.authservice.entity.UserRole;
import com.omstu.authservice.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<UserAdminResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<UserAdminResponse> changeRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        UserRole role = UserRole.valueOf(body.get("role"));
        return ResponseEntity.ok(adminService.changeRole(id, role));
    }

    @PatchMapping("/users/{id}/toggle-active")
    public ResponseEntity<UserAdminResponse> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.toggleActive(id));
    }
}
