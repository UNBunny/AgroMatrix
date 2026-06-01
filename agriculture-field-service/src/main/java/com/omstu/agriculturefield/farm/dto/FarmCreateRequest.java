package com.omstu.agriculturefield.farm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record FarmCreateRequest(
        @NotBlank @Size(max = 255) String name,
        String description,
        @NotBlank @Pattern(regexp = "\\d{10}|\\d{12}", message = "ИНН: 10 или 12 цифр") String inn,
        @Pattern(regexp = "\\d{9}", message = "КПП: 9 цифр") String kpp,
        @Pattern(regexp = "\\d{13}|\\d{15}", message = "ОГРН: 13 или 15 цифр") String ogrn,
        @NotBlank @Size(max = 255) String region,
        @Size(max = 500) String address
) {}
