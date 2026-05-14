package com.omstu.agriculturefield.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "services.weather-service")
public class WeatherServiceProperties {

    private String baseUrl = "http://localhost:8082";
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 30000;
    private int retryTimeoutMs = 50000;
    private int maxRetries = 2;
}

