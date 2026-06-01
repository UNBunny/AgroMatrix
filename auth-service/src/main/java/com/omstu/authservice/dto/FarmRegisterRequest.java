package com.omstu.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FarmRegisterRequest {

    @NotBlank @Size(max = 255)
    private String farmName;

    private String farmDescription;

    @NotBlank @Size(max = 12) @Pattern(regexp = "\\d{10}|\\d{12}", message = "ИНН должен содержать 10 или 12 цифр")
    private String inn;

    @Size(max = 9) @Pattern(regexp = "\\d{9}", message = "КПП должен содержать 9 цифр")
    private String kpp;

    @Size(max = 15) @Pattern(regexp = "\\d{13}|\\d{15}", message = "ОГРН должен содержать 13 или 15 цифр")
    private String ogrn;

    @NotBlank @Size(max = 255)
    private String region;

    @Size(max = 500)
    private String address;

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
