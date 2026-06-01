package com.omstu.agriculturefield.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AgroMatrix Agriculture Field API")
                        .version("1.0.0")
                        .description("API для управления полями, хозяйствами, культурами и агрономическими данными")
                        .contact(new Contact()
                                .name("AgroMatrix Team")
                                .url("https://github.com/UNBunny/AgroMatrix")));
    }
}
