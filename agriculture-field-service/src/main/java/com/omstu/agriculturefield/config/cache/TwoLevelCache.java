package com.omstu.agriculturefield.config.cache;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.support.AbstractValueAdaptingCache;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;

/**
 * Двухуровневый кэш: L1 = Caffeine (in-process, микросекунды), L2 = Redis (shared, миллисекунды).
 * <p>
 * Логика:
 * <ul>
 *   <li><b>get:</b> L1 → если miss, L2 → если hit в L2, прогреваем L1.</li>
 *   <li><b>put:</b> пишем в оба уровня.</li>
 *   <li><b>evict/clear:</b> вычищаем оба уровня.</li>
 * </ul>
 * <p>
 * Graceful degradation: если L2 (Redis) недоступен — ошибки логируются как WARN,
 * запрос обслуживается только L1.
 */
@Slf4j
public class TwoLevelCache extends AbstractValueAdaptingCache {

    private final String name;
    private final Cache l1;
    private final Cache l2;

    public TwoLevelCache(String name, Cache l1, Cache l2) {
        super(true); // allowNullValues
        this.name = name;
        this.l1 = l1;
        this.l2 = l2;
    }

    @Override
    @NonNull
    public String getName() {
        return name;
    }

    @Override
    @NonNull
    public Object getNativeCache() {
        return this; // нет «нативного» представления у композита
    }

    @Override
    @Nullable
    protected Object lookup(@NonNull Object key) {
        ValueWrapper l1Val = l1.get(key);
        if (l1Val != null) {
            return l1Val.get();
        }
        try {
            ValueWrapper l2Val = l2.get(key);
            if (l2Val != null) {
                Object value = l2Val.get();
                // прогреваем L1, чтобы следующий hit был микросекундным
                l1.put(key, value);
                return value;
            }
        } catch (Exception e) {
            log.warn("L2 (Redis) lookup failed for cache='{}' key={}: {}", name, key, e.getMessage());
        }
        return null;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T get(@NonNull Object key, @NonNull Callable<T> valueLoader) {
        ValueWrapper existing = get(key);
        if (existing != null) {
            return (T) existing.get();
        }
        try {
            T value = valueLoader.call();
            put(key, value);
            return value;
        } catch (Exception e) {
            throw new ValueRetrievalException(key, valueLoader, e);
        }
    }

    @Override
    @SuppressWarnings({"unchecked", "rawtypes"})
    @Nullable
    public CompletableFuture retrieve(@NonNull Object key) {
        ValueWrapper existing = get(key);
        if (existing == null) {
            return null;
        }
        return CompletableFuture.completedFuture(existing.get());
    }

    @Override
    @SuppressWarnings("unchecked")
    public <F> CompletableFuture<F> retrieve(@NonNull Object key, @NonNull Supplier<CompletableFuture<F>> valueLoader) {
        ValueWrapper existing = get(key);
        if (existing != null) {
            return CompletableFuture.completedFuture((F) existing.get());
        }
        return valueLoader.get().thenApply(value -> {
            put(key, value);
            return value;
        });
    }

    @Override
    public void put(@NonNull Object key, @Nullable Object value) {
        l1.put(key, value);
        try {
            l2.put(key, value);
        } catch (Exception e) {
            log.warn("L2 (Redis) put failed for cache='{}' key={}: {}", name, key, e.getMessage());
        }
    }

    @Override
    public void evict(@NonNull Object key) {
        l1.evict(key);
        try {
            l2.evict(key);
        } catch (Exception e) {
            log.warn("L2 (Redis) evict failed for cache='{}' key={}: {}", name, key, e.getMessage());
        }
    }

    @Override
    public void clear() {
        l1.clear();
        try {
            l2.clear();
        } catch (Exception e) {
            log.warn("L2 (Redis) clear failed for cache='{}': {}", name, e.getMessage());
        }
    }
}
