package com.omstu.agriculturefield.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "services.ml-service")
public class MLServiceProperties {

    private String baseUrl = "http://localhost:8090/api";
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 30000;
}