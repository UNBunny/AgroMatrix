package com.omstu.agriculturefield.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "services.ndvi-service")
public class NdviServiceProperties {

    private String url = "http://localhost:8083";
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 30000;
}
