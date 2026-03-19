package com.omstu.ndvi.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Value("${cache.ndvi-current.ttl-hours:24}")
    private long ndviCurrentTtlHours;

    @Value("${cache.max-size:1000}")
    private long defaultMaxSize;

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(
                buildTtlCache("ndviCurrent", ndviCurrentTtlHours, defaultMaxSize),
                buildEternalCache("ndviHistory", defaultMaxSize)
        ));
        return manager;
    }

    private CaffeineCache buildTtlCache(String name, long ttlHours, long maxSize) {
        return new CaffeineCache(name, Caffeine.newBuilder()
                .expireAfterWrite(ttlHours, TimeUnit.HOURS)
                .maximumSize(maxSize)
                .recordStats()
                .build());
    }

    private CaffeineCache buildEternalCache(String name, long maxSize) {
        return new CaffeineCache(name, Caffeine.newBuilder()
                .maximumSize(maxSize)
                .recordStats()
                .build());
    }
}
