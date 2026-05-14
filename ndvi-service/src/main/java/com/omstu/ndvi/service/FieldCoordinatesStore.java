package com.omstu.ndvi.service;

import com.omstu.ndvi.dto.NdviFieldRequest;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory хранилище координат полей, переданных через API.
 * Заполняется при любом запросе с координатами (init, refresh, satellite-history).
 * Используется планировщиком для ежедневного обновления NDVI.
 */
@Component
public class FieldCoordinatesStore {

    private final Map<Long, NdviFieldRequest> store = new ConcurrentHashMap<>();

    public void put(NdviFieldRequest request) {
        store.put(request.fieldId(), request);
    }

    public Optional<NdviFieldRequest> get(Long fieldId) {
        return Optional.ofNullable(store.get(fieldId));
    }

    public Collection<NdviFieldRequest> getAll() {
        return store.values();
    }
}
