package com.omstu.agriculturefield.config;

import com.omstu.agriculturefield.config.cache.CacheSpec;
import com.omstu.agriculturefield.config.cache.TwoLevelCacheManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import java.time.Duration;
import java.util.List;

/**
 * Двухуровневое кэширование: Caffeine (L1) + Redis (L2).
 * <p>
 * Имена кэшей и их TTL должны совпадать с теми, что используются в коде через
 * {@code @Cacheable(value = "...")}. При добавлении нового кэша — добавить сюда.
 */
@Configuration
public class CacheConfig {

    private static final String REDIS_KEY_PREFIX = "agro:field:";

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

    @Value("${cache.soil-grids.ttl-hours:720}")
    private long soilGridsTtlHours;

    @Value("${cache.soil-grids.max-size:5000}")
    private long soilGridsMaxSize;

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        List<CacheSpec> specs = List.of(
                CacheSpec.ttl("weatherClimate",   Duration.ofHours(weatherClimateTtlHours),  weatherClimateMaxSize),
                CacheSpec.ttl("yieldPredictions", Duration.ofHours(yieldPredictionsTtlHours), defaultMaxSize),
                CacheSpec.ttl("pricePredictions", Duration.ofHours(pricePredictionsTtlHours), defaultMaxSize),
                CacheSpec.ttl("priceHistory",     Duration.ofHours(priceHistoryTtlHours),     defaultMaxSize),
                CacheSpec.ttl("soilGrids",        Duration.ofHours(soilGridsTtlHours),        soilGridsMaxSize),
                CacheSpec.eternal("soilRecommendations", defaultMaxSize)
        );
        return new TwoLevelCacheManager(specs, redisConnectionFactory, REDIS_KEY_PREFIX);
    }
}
