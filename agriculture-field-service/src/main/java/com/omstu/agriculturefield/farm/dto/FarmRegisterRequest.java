package com.omstu.agriculturefield.farm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record FarmRegisterRequest(
        @NotBlank @Size(max = 255) String name,
        String description,
        @NotBlank @Pattern(regexp = "\\d{10}|\\d{12}") String inn,
        @Pattern(regexp = "\\d{9}") String kpp,
        @Pattern(regexp = "\\d{13}|\\d{15}") String ogrn,
        @NotBlank @Size(max = 255) String region,
        @Size(max = 500) String address,
        @NotBlank @Size(min = 3, max = 100) String username,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6) String password,
        String firstName,
        String lastName,
        String phone
) {}
