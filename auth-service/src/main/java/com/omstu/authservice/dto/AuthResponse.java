package com.omstu.authservice.dto;

import com.omstu.authservice.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private Long userId;
    private String username;
    private String email;
    private UserRole role;
    private Long farmId;
    private java.util.Set<Long> farmIds;
    private String firstName;
    private String lastName;
    private String organization;
}
