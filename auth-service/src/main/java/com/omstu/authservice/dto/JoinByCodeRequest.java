package com.omstu.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class JoinByCodeRequest {

    @NotBlank @Size(min = 8, max = 8)
    private String inviteCode;

    @NotBlank @Size(min = 3, max = 100)
    private String username;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 6, max = 100)
    private String password;

    @NotBlank @Size(max = 100)
    private String firstName;

    @NotBlank @Size(max = 100)
    private String lastName;

    @Size(max = 20)
    private String phone;
}
