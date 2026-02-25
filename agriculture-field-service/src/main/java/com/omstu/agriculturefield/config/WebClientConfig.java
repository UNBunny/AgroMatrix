package com.omstu.agriculturefield.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
@RequiredArgsConstructor
public class WebClientConfig {

    private final WeatherServiceProperties weatherProps;
    private final AgroMonitoringProperties agroMonitoringProps;
    private final MLServiceProperties mlServiceProps;
    private final NdviServiceProperties ndviServiceProps;

    @Bean("weatherWebClient")
    public WebClient weatherWebClient() {
        return createWebClient(
                weatherProps.getBaseUrl(),
                weatherProps.getConnectTimeoutMs(),
                weatherProps.getReadTimeoutMs()
        );
    }

    @Bean("agroMonitoringWebClient")
    public WebClient agroMonitoringWebClient() {
        return createWebClient(
                agroMonitoringProps.getBaseUrl(),
                agroMonitoringProps.getConnectTimeoutMs(),
                agroMonitoringProps.getReadTimeoutMs()
        );
    }

    @Bean("mlWebClient")
    public WebClient mlWebClient() {
        return createWebClient(
                mlServiceProps.getBaseUrl(),
                mlServiceProps.getConnectTimeoutMs(),
                mlServiceProps.getReadTimeoutMs()
        );
    }

    @Bean("ndviWebClient")
    public WebClient ndviWebClient() {
        return createWebClient(
                ndviServiceProps.getUrl(),
                ndviServiceProps.getConnectTimeoutMs(),
                ndviServiceProps.getReadTimeoutMs()
        );
    }

    private WebClient createWebClient(String baseUrl, int connectTimeoutMs, long readTimeoutMs) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
                .responseTimeout(Duration.ofMillis(readTimeoutMs))
                .doOnConnected(conn ->
                        conn.addHandlerLast(new ReadTimeoutHandler(
                                readTimeoutMs, TimeUnit.MILLISECONDS)));

        return WebClient.builder()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
    }
}