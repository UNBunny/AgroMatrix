package com.omstu.authservice.config;

import com.omstu.authservice.entity.User;
import com.omstu.authservice.entity.UserRole;
import com.omstu.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password:admin}")
    private String adminPassword;

    @Value("${admin.email:admin@agro.local}")
    private String adminEmail;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername(adminUsername)) {
            return;
        }
        User admin = User.builder()
                .username(adminUsername)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(UserRole.ADMIN)
                .firstName("Admin")
                .lastName("")
                .build();
        userRepository.save(admin);
        log.info("Admin user created: username={}", adminUsername);
    }
}
