package com.omstu.apigateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.reactivestreams.Publisher;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

@Component
public class AuthCookieFilter implements GlobalFilter, Ordered {

    private static final List<String> AUTH_PATHS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/api/auth/join"
    );

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        boolean isAuthPath = AUTH_PATHS.stream().anyMatch(path::startsWith);

        if (!isAuthPath) {
            return chain.filter(exchange);
        }

        ServerHttpResponse originalResponse = exchange.getResponse();
        DataBufferFactory bufferFactory = originalResponse.bufferFactory();

        ServerHttpResponseDecorator decoratedResponse = new ServerHttpResponseDecorator(originalResponse) {
            @Override
            public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
                if (!(body instanceof Flux)) {
                    return super.writeWith(body);
                }

                Flux<? extends DataBuffer> fluxBody = (Flux<? extends DataBuffer>) body;

                return super.writeWith(fluxBody.buffer().map(dataBuffers -> {
                    byte[] bytes = new byte[dataBuffers.stream()
                            .mapToInt(DataBuffer::readableByteCount).sum()];
                    int offset = 0;
                    for (DataBuffer buffer : dataBuffers) {
                        int len = buffer.readableByteCount();
                        buffer.read(bytes, offset, len);
                        offset += len;
                    }

                    try {
                        if (getStatusCode() != null && getStatusCode().is2xxSuccessful()) {
                            String json = new String(bytes, StandardCharsets.UTF_8);
                            JsonNode node = objectMapper.readTree(json);
                            boolean changed = false;

                            JsonNode accessNode = node.get("accessToken");
                            if (accessNode != null && !accessNode.isNull()) {
                                ResponseCookie accessCookie = ResponseCookie.from("access_token", accessNode.asText())
                                        .httpOnly(true)
                                        .secure(false)
                                        .sameSite("Lax")
                                        .path("/")
                                        .maxAge(Duration.ofSeconds(1800))
                                        .build();
                                getDelegate().getHeaders().add(HttpHeaders.SET_COOKIE, accessCookie.toString());
                                changed = true;
                            }

                            JsonNode refreshNode = node.get("refreshToken");
                            if (refreshNode != null && !refreshNode.isNull()) {
                                ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", refreshNode.asText())
                                        .httpOnly(true)
                                        .secure(false)
                                        .sameSite("Lax")
                                        .path("/api/auth")
                                        .maxAge(Duration.ofDays(7))
                                        .build();
                                getDelegate().getHeaders().add(HttpHeaders.SET_COOKIE, refreshCookie.toString());
                                changed = true;
                            }

                            if (changed) {
                                com.fasterxml.jackson.databind.node.ObjectNode cleaned =
                                        objectMapper.createObjectNode()
                                                .put("userId", node.path("userId").asLong())
                                                .put("username", node.path("username").asText())
                                                .put("email", node.path("email").asText())
                                                .put("role", node.path("role").asText())
                                                .put("firstName", node.path("firstName").asText(""))
                                                .put("lastName", node.path("lastName").asText(""))
                                                .put("organization", node.path("organization").asText(""));
                                bytes = objectMapper.writeValueAsBytes(cleaned);
                            }
                        }
                    } catch (Exception ignored) {
                    }

                    getDelegate().getHeaders().setContentLength(bytes.length);
                    return bufferFactory.wrap(bytes);
                }));
            }
        };

        return chain.filter(exchange.mutate().response(decoratedResponse).build());
    }

    @Override
    public int getOrder() {
        return -99;
    }
}
