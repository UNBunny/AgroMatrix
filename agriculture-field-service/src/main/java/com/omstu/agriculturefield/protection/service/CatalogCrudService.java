package com.omstu.agriculturefield.protection.service;

import com.omstu.agriculturefield.protection.dto.CropProtectionEntryDto;
import com.omstu.agriculturefield.protection.dto.CropProtectionEntryRequest;
import com.omstu.agriculturefield.protection.model.CropProtectionCatalogEntry;
import com.omstu.agriculturefield.protection.repository.CropProtectionCatalogRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CatalogCrudService {

    private final CropProtectionCatalogRepository repository;

    public List<CropProtectionEntryDto> findAll() {
        log.info("Fetching all catalog entries");
        return repository.findAll().stream().map(this::toDto).toList();
    }

    public CropProtectionEntryDto findById(Long id) {
        log.info("Fetching catalog entry id={}", id);
        return toDto(getOrThrow(id));
    }

    @Transactional
    public CropProtectionEntryDto create(CropProtectionEntryRequest req) {
        log.info("Creating catalog entry product={}, crop={}", req.productName(), req.cropCode());
        CropProtectionCatalogEntry entry = new CropProtectionCatalogEntry();
        apply(entry, req);
        entry.setCreatedAt(LocalDateTime.now());
        CropProtectionEntryDto result = toDto(repository.save(entry));
        log.info("Created catalog entry id={}", result.id());
        return result;
    }

    @Transactional
    public CropProtectionEntryDto update(Long id, CropProtectionEntryRequest req) {
        log.info("Updating catalog entry id={}", id);
        CropProtectionCatalogEntry entry = getOrThrow(id);
        apply(entry, req);
        return toDto(repository.save(entry));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new EntityNotFoundException("Catalog entry not found: " + id);
        }
        log.info("Deleting catalog entry id={}", id);
        repository.deleteById(id);
    }

    private CropProtectionCatalogEntry getOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Catalog entry not found: " + id));
    }

    private void apply(CropProtectionCatalogEntry e, CropProtectionEntryRequest r) {
        e.setCropCode(r.cropCode());
        e.setDiseaseName(r.diseaseName());
        e.setPathogenLatin(r.pathogenLatin());
        e.setDiseaseType(r.diseaseType());
        e.setProductName(r.productName());
        e.setFracGroup(r.fracGroup());
        e.setFracCode(r.fracCode());
        e.setActiveIngredients(r.activeIngredients());
        e.setAiConcentration(r.aiConcentration());
        e.setApplicationType(r.applicationType());
        e.setBbchFrom(r.bbchFrom());
        e.setBbchTo(r.bbchTo());
        e.setBbchNote(r.bbchNote());
        e.setDoseRate(r.doseRate());
        e.setDoseValue(r.doseValue());
        e.setDoseUnit(r.doseUnit());
        e.setTempMinC(r.tempMinC());
        e.setTempOptC(r.tempOptC());
        e.setTempMaxC(r.tempMaxC());
        e.setPhiDays(r.phiDays());
        e.setNotes(r.notes());
        e.setIsActive(r.isActive());
    }

    private CropProtectionEntryDto toDto(CropProtectionCatalogEntry e) {
        return new CropProtectionEntryDto(
                e.getId(), e.getCropCode(), e.getDiseaseName(), e.getPathogenLatin(),
                e.getDiseaseType(), e.getProductName(), e.getFracGroup(), e.getFracCode(),
                e.getActiveIngredients(), e.getAiConcentration(), e.getApplicationType(),
                e.getBbchFrom(), e.getBbchTo(), e.getBbchNote(),
                e.getDoseRate(), e.getDoseValue(), e.getDoseUnit(),
                e.getTempMinC(), e.getTempOptC(), e.getTempMaxC(),
                e.getPhiDays(), e.getNotes(), e.getIsActive());
    }
}
