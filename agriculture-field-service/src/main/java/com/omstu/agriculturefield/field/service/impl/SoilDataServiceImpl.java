package com.omstu.agriculturefield.field.service.impl;

import com.omstu.agriculturefield.common.exception.ConflictException;
import com.omstu.agriculturefield.common.exception.ExternalServiceException;
import com.omstu.agriculturefield.common.exception.NotFoundException;
import com.omstu.agriculturefield.common.exception.ValidationException;
import com.omstu.agriculturefield.field.dto.SoilDataDto;
import com.omstu.agriculturefield.field.dto.SoilDataRequest;
import com.omstu.agriculturefield.field.mapper.SoilDataMapper;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.model.SoilData;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import com.omstu.agriculturefield.field.repository.SoilDataRepository;
import com.omstu.agriculturefield.field.service.SoilDataService;
import com.omstu.agriculturefield.field.service.SoilGridsClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Polygon;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class SoilDataServiceImpl implements SoilDataService {

    private static final Set<String> VALID_SOIL_TEXTURES = Set.of(
            "SAND", "LOAMY_SAND", "SANDY_LOAM", "LOAM", "SILT_LOAM", "SILT",
            "SANDY_CLAY_LOAM", "CLAY_LOAM", "SILTY_CLAY_LOAM", "SANDY_CLAY",
            "SILTY_CLAY", "CLAY"
    );

    private final SoilDataRepository soilDataRepository;
    private final AgriculturalFieldRepository fieldRepository;
    private final SoilGridsClient soilGridsClient;
    private final SoilDataMapper soilDataMapper;

    @Override
    @Transactional(readOnly = true)
    public SoilDataDto getSoilDataForField(Long fieldId) {
        SoilData soilData = soilDataRepository.findByFieldId(fieldId)
                .orElseThrow(() -> new NotFoundException("Soil data not found for field: " + fieldId));
        return soilDataMapper.toDto(soilData);
    }

    @Override
    @Transactional
    public SoilDataDto fetchAndSaveFromSoilGrids(Long fieldId) {
        log.info("Fetching soil data from SoilGrids for field {}", fieldId);

        AgriculturalField field = fieldRepository.findById(fieldId)
                .orElseThrow(() -> new NotFoundException("Field not found: " + fieldId));

        double lat = field.getGeom().getCentroid().getY();
        double lon = field.getGeom().getCentroid().getX();

        SoilGridsClient.SoilGridsData soilGridsData = fetchWithFallback(lat, lon, field.getGeom());

        if (soilGridsData == null) {
            log.warn("Failed to fetch soil data from SoilGrids for field {}", fieldId);
            throw new ExternalServiceException("Unable to fetch soil data from SoilGrids");
        }

        Optional<SoilData> existingOpt = soilDataRepository.findByFieldId(fieldId);
        SoilData soilData = existingOpt.orElseGet(() -> {
            SoilData newSoilData = new SoilData();
            newSoilData.setField(field);
            return newSoilData;
        });

        // Update with SoilGrids data (preserve manual values if source is MANUAL)
        if (existingOpt.isPresent() && existingOpt.get().getSource() == SoilData.SoilDataSource.MANUAL) {
            log.info("Preserving manual soil data for field {}. Skipping SoilGrids update.", fieldId);
            return soilDataMapper.toDto(existingOpt.get());
        }

        updateSoilDataFromGrids(soilData, soilGridsData);
        SoilData saved = soilDataRepository.save(soilData);

        log.info("Saved soil data from SoilGrids for field {}: N={}, P={}, K={}, pH={}",
                fieldId, soilGridsData.getNitrogenN(), soilGridsData.getPhosphorusP(),
                soilGridsData.getPotassiumK(), soilGridsData.getPhLevel());

        return soilDataMapper.toDto(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "soilRecommendations", key = "#fieldId")
    public SoilDataDto updateSoilDataManually(Long fieldId, SoilDataRequest request) {
        log.info("Updating manual soil data for field {}", fieldId);
        validateSoilDataRequest(request);
        return createOrUpdateSoilData(fieldId, request, false);
    }

    private void validateSoilDataRequest(SoilDataRequest request) {
        // Validate pH level (0-14)
        if (request.phLevel() != null && (request.phLevel() < 0 || request.phLevel() > 14)) {
            throw new ValidationException("pH level must be between 0 and 14");
        }

        // Validate soil texture
        if (request.soilTexture() != null && !VALID_SOIL_TEXTURES.contains(request.soilTexture())) {
            throw new ValidationException("Invalid soil texture: " + request.soilTexture() +
                    ". Valid values: " + VALID_SOIL_TEXTURES);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "soilRecommendations", key = "#fieldId", condition = "#isManual")
    public SoilDataDto createOrUpdateSoilData(Long fieldId, SoilDataRequest request, boolean isManual) {
        validateSoilDataRequest(request);

        AgriculturalField field = fieldRepository.findById(fieldId)
                .orElseThrow(() -> new NotFoundException("Field not found: " + fieldId));

        // Check if soil data already exists for this field
        if (isManual && soilDataRepository.existsByFieldId(fieldId)) {
            throw new ConflictException("Soil data already exists for field: " + fieldId);
        }

        SoilData soilData = soilDataRepository.findByFieldId(fieldId)
                .orElseGet(() -> {
                    SoilData newSoilData = new SoilData();
                    newSoilData.setField(field);
                    return newSoilData;
                });

        // Update fields
        if (request.nitrogenN() != null) soilData.setNitrogenN(request.nitrogenN());
        if (request.phosphorusP() != null) soilData.setPhosphorusP(request.phosphorusP());
        if (request.potassiumK() != null) soilData.setPotassiumK(request.potassiumK());
        if (request.phLevel() != null) soilData.setPhLevel(request.phLevel());
        if (request.organicMatter() != null) soilData.setOrganicMatter(request.organicMatter());
        if (request.soilTexture() != null) soilData.setSoilTexture(request.soilTexture());
        if (request.cec() != null) soilData.setCec(request.cec());
        if (request.bulkDensity() != null) soilData.setBulkDensity(request.bulkDensity());
        if (request.notes() != null) soilData.setNotes(request.notes());

        soilData.setSource(SoilData.SoilDataSource.MANUAL);

        SoilData saved = soilDataRepository.save(soilData);
        return soilDataMapper.toDto(saved);
    }

    private SoilGridsClient.SoilGridsData fetchWithFallback(double lat, double lon, Polygon polygon) {
        SoilGridsClient.SoilGridsData data = soilGridsClient.fetchSoilData(lat, lon);
        if (data != null) return data;

        log.info("Centroid ({}, {}) failed, trying fallback points within field polygon", lat, lon);

        Envelope env = polygon.getEnvelopeInternal();
        int steps = 4;
        List<double[]> candidates = new ArrayList<>();
        for (int i = 0; i <= steps; i++) {
            for (int j = 0; j <= steps; j++) {
                double candidateLat = env.getMinY() + (env.getMaxY() - env.getMinY()) * i / steps;
                double candidateLon = env.getMinX() + (env.getMaxX() - env.getMinX()) * j / steps;
                org.locationtech.jts.geom.Point point = polygon.getFactory() // NOSONAR - Point not imported to avoid clash
                        .createPoint(new Coordinate(candidateLon, candidateLat));
                if (polygon.contains(point)) {
                    candidates.add(new double[]{candidateLat, candidateLon});
                }
            }
        }

        for (double[] candidate : candidates) {
            double cLat = candidate[0];
            double cLon = candidate[1];
            if (Math.abs(cLat - lat) < 1e-6 && Math.abs(cLon - lon) < 1e-6) continue;
            log.info("Trying fallback point: ({}, {})", cLat, cLon);
            data = soilGridsClient.fetchSoilData(cLat, cLon);
            if (data != null) {
                log.info("Fallback succeeded at ({}, {})", cLat, cLon);
                return data;
            }
        }

        log.warn("All fallback points exhausted for field polygon");
        return null;
    }

    private void updateSoilDataFromGrids(SoilData soilData, SoilGridsClient.SoilGridsData gridsData) {
        if (gridsData.getNitrogenN() != null) soilData.setNitrogenN(gridsData.getNitrogenN());
        if (gridsData.getPhosphorusP() != null) soilData.setPhosphorusP(gridsData.getPhosphorusP());
        if (gridsData.getPotassiumK() != null) soilData.setPotassiumK(gridsData.getPotassiumK());
        if (gridsData.getPhLevel() != null) soilData.setPhLevel(gridsData.getPhLevel());
        if (gridsData.getOrganicMatter() != null) soilData.setOrganicMatter(gridsData.getOrganicMatter());
        if (gridsData.getCec() != null) soilData.setCec(gridsData.getCec());
        if (gridsData.getBulkDensity() != null) soilData.setBulkDensity(gridsData.getBulkDensity());
        if (gridsData.getSoilTexture() != null) soilData.setSoilTexture(gridsData.getSoilTexture());

        soilData.setConfidence(gridsData.getConfidence());
        soilData.setSoilgridsVersion(gridsData.getSoilgridsVersion());
        soilData.setLastSyncedAt(LocalDateTime.now());
        soilData.setSource(SoilData.SoilDataSource.AUTO);
    }
}