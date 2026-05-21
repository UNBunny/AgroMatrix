package com.omstu.authservice.dto;

import com.omstu.authservice.entity.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
public class UserAdminResponse {
    private Long id;
    private String username;
    private String email;
    private UserRole role;
    private String firstName;
    private String lastName;
    private String organization;
    private String phone;
    private Long activeFarmId;
    private Set<Long> farmIds;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
