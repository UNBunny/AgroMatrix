package com.omstu.authservice.dto;

import com.omstu.authservice.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    @Size(min = 3, max = 100)
    private String username;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6, max = 100)
    private String password;

    private String firstName;
    private String lastName;
    private String organization;
    private String phone;

    private UserRole role = UserRole.AGRONOMIST;

    private Long farmId;
}
