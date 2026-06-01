package com.omstu.weatherservice.config;

import com.omstu.weatherservice.config.cache.CacheSpec;
import com.omstu.weatherservice.config.cache.TwoLevelCacheManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import java.time.Duration;
import java.util.List;

/**
 * Кэши Weather Service.
 * <ul>
 *   <li><b>weatherApi</b> — ответы Open-Meteo API (forecast и historical). TTL 1 ч.
 *   <li><b>seasonalMetrics</b> — рассчитанные сезонные агрометрики для прошедших лет. TTL 30 дней.
 * </ul>
 */
@Configuration
public class CacheConfig {

    private static final String REDIS_KEY_PREFIX = "agro:weather:";

    @Value("${cache.weather-api.ttl-minutes:60}")
    private long weatherApiTtlMinutes;

    @Value("${cache.weather-api.max-size:2000}")
    private long weatherApiMaxSize;

    @Value("${cache.seasonal-metrics.ttl-hours:720}")
    private long seasonalMetricsTtlHours;

    @Value("${cache.seasonal-metrics.max-size:5000}")
    private long seasonalMetricsMaxSize;

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        List<CacheSpec> specs = List.of(
                CacheSpec.ttl("weatherApi",       Duration.ofMinutes(weatherApiTtlMinutes),    weatherApiMaxSize),
                CacheSpec.ttl("seasonalMetrics",  Duration.ofHours(seasonalMetricsTtlHours),   seasonalMetricsMaxSize)
        );
        return new TwoLevelCacheManager(specs, redisConnectionFactory, REDIS_KEY_PREFIX);
    }
}
