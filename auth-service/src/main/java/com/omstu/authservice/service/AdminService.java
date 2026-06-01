package com.omstu.authservice.service;

import com.omstu.authservice.dto.UserAdminResponse;
import com.omstu.authservice.entity.User;
import com.omstu.authservice.entity.UserRole;
import com.omstu.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;

    public List<UserAdminResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toAdminResponse)
                .toList();
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        userRepository.delete(user);
        log.info("User deleted by admin: id={}, username={}", id, user.getUsername());
    }

    @Transactional
    public UserAdminResponse changeRole(Long id, UserRole role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        user.setRole(role);
        userRepository.save(user);
        log.info("User role changed by admin: id={}, newRole={}", id, role);
        return toAdminResponse(user);
    }

    @Transactional
    public UserAdminResponse toggleActive(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        user.setIsActive(!Boolean.TRUE.equals(user.getIsActive()));
        userRepository.save(user);
        log.info("User active toggled by admin: id={}, isActive={}", id, user.getIsActive());
        return toAdminResponse(user);
    }

    private UserAdminResponse toAdminResponse(User user) {
        return UserAdminResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .organization(user.getOrganization())
                .phone(user.getPhone())
                .activeFarmId(user.getActiveFarmId())
                .farmIds(user.getFarmIds())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
