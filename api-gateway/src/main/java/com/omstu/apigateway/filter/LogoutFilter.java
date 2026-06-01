package com.omstu.apigateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.ResponseCookie;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Component
public class LogoutFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String method = exchange.getRequest().getMethod().name();

        if (!"/api/auth/logout".equals(path) || !"POST".equalsIgnoreCase(method)) {
            return chain.filter(exchange);
        }

        ServerHttpResponse originalResponse = exchange.getResponse();
        ServerHttpResponseDecorator decoratedResponse = new ServerHttpResponseDecorator(originalResponse) {
            @Override
            public Mono<Void> setComplete() {
                clearCookies();
                return super.setComplete();
            }

            @Override
            public Mono<Void> writeWith(org.reactivestreams.Publisher<? extends org.springframework.core.io.buffer.DataBuffer> body) {
                clearCookies();
                return super.writeWith(body);
            }

            private void clearCookies() {
                getDelegate().addCookie(ResponseCookie.from("access_token", "")
                        .httpOnly(true).secure(false).sameSite("Strict")
                        .path("/").maxAge(Duration.ZERO).build());
                getDelegate().addCookie(ResponseCookie.from("refresh_token", "")
                        .httpOnly(true).secure(false).sameSite("Strict")
                        .path("/api/auth").maxAge(Duration.ZERO).build());
            }
        };

        return chain.filter(exchange.mutate().response(decoratedResponse).build());
    }

    @Override
    public int getOrder() {
        return -200;
    }
}
