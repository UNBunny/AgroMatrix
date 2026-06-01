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
public class UserInfoResponse {
    private Long id;
    private String username;
    private String email;
    private UserRole role;
    private String firstName;
    private String lastName;
    private String organization;
    private String phone;
}
