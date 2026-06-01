package com.omstu.agriculturefield.config.cache;

import java.time.Duration;

/**
 * Описание одного логического кэша: имя, TTL и L1 maximum size.
 * TTL = null означает «вечный» кэш (только явная инвалидация).
 */
public record CacheSpec(String name, Duration ttl, long l1MaxSize) {

    public static CacheSpec ttl(String name, Duration ttl, long l1MaxSize) {
        return new CacheSpec(name, ttl, l1MaxSize);
    }

    public static CacheSpec eternal(String name, long l1MaxSize) {
        return new CacheSpec(name, null, l1MaxSize);
    }
}
