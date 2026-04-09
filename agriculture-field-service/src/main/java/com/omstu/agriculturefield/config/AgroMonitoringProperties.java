package com.omstu.agriculturefield.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "services.agromonitoring")
public class AgroMonitoringProperties {

    private String baseUrl = "http://agromonitoring.com/agro/1.0";

    @NotBlank(message = "AGROMONITORING_API_KEY must not be blank")
    private String apiKey;

    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 30000;
}

