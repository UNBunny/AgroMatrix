package com.omstu.ndvi.config;

import com.omstu.ndvi.config.cache.CacheSpec;
import com.omstu.ndvi.config.cache.TwoLevelCacheManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import java.time.Duration;
import java.util.List;

/**
 * Двухуровневое кэширование: Caffeine (L1) + Redis (L2).
 */
@Configuration
public class CacheConfig {

    private static final String REDIS_KEY_PREFIX = "agro:ndvi:";

    @Value("${cache.ndvi-current.ttl-hours:24}")
    private long ndviCurrentTtlHours;

    @Value("${cache.max-size:1000}")
    private long defaultMaxSize;

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        List<CacheSpec> specs = List.of(
                CacheSpec.ttl("ndviCurrent", Duration.ofHours(ndviCurrentTtlHours), defaultMaxSize),
                CacheSpec.eternal("ndviHistory", defaultMaxSize)
        );
        return new TwoLevelCacheManager(specs, redisConnectionFactory, REDIS_KEY_PREFIX);
    }
}
