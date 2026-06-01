package com.omstu.ndvi.config.cache;

import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * CacheManager, который для каждого {@link CacheSpec} строит {@link TwoLevelCache}
 * (L1 = Caffeine, L2 = Redis с namespace-префиксом).
 */
@Slf4j
public class TwoLevelCacheManager implements CacheManager {

    private final Map<String, Cache> caches = new ConcurrentHashMap<>();

    public TwoLevelCacheManager(List<CacheSpec> specs,
                                RedisConnectionFactory redisConnectionFactory,
                                String keyPrefix) {
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();
        RedisCacheConfiguration baseCfg = RedisCacheConfiguration.defaultCacheConfig()
                .computePrefixWith(cacheName -> keyPrefix + cacheName + ":")
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> perCacheCfg = new HashMap<>();
        for (CacheSpec spec : specs) {
            RedisCacheConfiguration cfg = baseCfg;
            if (spec.ttl() != null) {
                cfg = cfg.entryTtl(spec.ttl());
            }
            perCacheCfg.put(spec.name(), cfg);
        }

        RedisCacheManager redisCacheManager = RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(baseCfg)
                .withInitialCacheConfigurations(perCacheCfg)
                .build();
        redisCacheManager.initializeCaches();

        for (CacheSpec spec : specs) {
            CaffeineCache l1 = buildL1(spec);
            Cache l2 = redisCacheManager.getCache(spec.name());
            if (l2 == null) {
                throw new IllegalStateException("Redis cache not initialized for: " + spec.name());
            }
            caches.put(spec.name(), new TwoLevelCache(spec.name(), l1, l2));
            log.info("Initialized two-level cache '{}' (L1 max={}, TTL={})",
                    spec.name(), spec.l1MaxSize(),
                    spec.ttl() == null ? "eternal" : spec.ttl());
        }
    }

    private CaffeineCache buildL1(CacheSpec spec) {
        Caffeine<Object, Object> builder = Caffeine.newBuilder()
                .maximumSize(spec.l1MaxSize())
                .recordStats();
        if (spec.ttl() != null) {
            Duration l1Ttl = spec.ttl().compareTo(Duration.ofHours(1)) < 0 ? spec.ttl() : Duration.ofHours(1);
            builder.expireAfterWrite(l1Ttl);
        }
        return new CaffeineCache(spec.name(), builder.build());
    }

    @Override
    @Nullable
    public Cache getCache(@NonNull String name) {
        return caches.get(name);
    }

    @Override
    @NonNull
    public Collection<String> getCacheNames() {
        return caches.keySet();
    }
}
