package com.omstu.agriculturefield.config;

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

    @Value("${cache.weather-climate.ttl-hours:24}")
    private long weatherClimateTtlHours;

    @Value("${cache.weather-climate.max-size:500}")
    private long weatherClimateMaxSize;

    @Value("${cache.yield-predictions.ttl-hours:12}")
    private long yieldPredictionsTtlHours;

    @Value("${cache.price-predictions.ttl-hours:12}")
    private long pricePredictionsTtlHours;

    @Value("${cache.price-history.ttl-hours:24}")
    private long priceHistoryTtlHours;

    @Value("${cache.max-size:1000}")
    private long defaultMaxSize;

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(
                buildTtlCache("weatherClimate",      weatherClimateTtlHours,    weatherClimateMaxSize),
                buildTtlCache("yieldPredictions",    yieldPredictionsTtlHours,  defaultMaxSize),
                buildTtlCache("pricePredictions",    pricePredictionsTtlHours,  defaultMaxSize),
                buildTtlCache("priceHistory",        priceHistoryTtlHours,      defaultMaxSize),
                buildEternalCache("soilRecommendations", defaultMaxSize)
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
