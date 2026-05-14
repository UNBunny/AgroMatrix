package com.omstu.agriculturefield.rotation.service.impl;

import com.omstu.agriculturefield.field.model.SoilData;
import com.omstu.agriculturefield.rotation.dto.PriceHistoryResponse;
import com.omstu.agriculturefield.rotation.dto.PricePredictionResponse;
import com.omstu.agriculturefield.rotation.dto.SeasonalWeatherDto;
import com.omstu.agriculturefield.rotation.dto.SoilCropRecommendationRequest;
import com.omstu.agriculturefield.rotation.dto.SoilCropRecommendationResponse;
import com.omstu.agriculturefield.rotation.dto.YieldPredictionRequest;
import com.omstu.agriculturefield.rotation.dto.YieldPredictionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class MlCacheService {

    private static final String DEFAULT_REGION_CODE = "OMS";
    private static final String DEFAULT_REGION_NAME = "Омская область";

    // типичный месяц уборки по культуре — нужен для прогноза цены
    private static final Map<String, Integer> CROP_HARVEST_MONTH = Map.ofEntries(
            Map.entry("wheat",     8),
            Map.entry("barley",    7),
            Map.entry("corn",      9),
            Map.entry("sunflower", 9),
            Map.entry("rapeseed",  7),
            Map.entry("peas",      7),
            Map.entry("buckwheat", 9),
            Map.entry("oat",       8),
            Map.entry("rye",       7),
            Map.entry("millet",    9)
    );

    private static final Map<String, String> YIELD_TO_PRICE_CROP_CODE = Map.ofEntries(
            Map.entry("spring_wheat",  "wheat"),
            Map.entry("winter_wheat",  "wheat"),
            Map.entry("spring_barley", "barley"),
            Map.entry("winter_barley", "barley"),
            Map.entry("corn",          "corn"),
            Map.entry("sunflower",     "sunflower"),
            Map.entry("rapeseed",      "rapeseed"),
            Map.entry("peas",          "peas"),
            Map.entry("buckwheat",     "buckwheat"),
            Map.entry("oat",           "oat"),
            Map.entry("rye",           "rye"),
            Map.entry("millet",        "millet")
    );

    private final WebClient mlWebClient;

    public MlCacheService(@Qualifier("mlWebClient") WebClient mlWebClient) {
        this.mlWebClient = mlWebClient;
    }

    // кэш без TTL — инвалидируется через @CacheEvict при обновлении почвы
    @Cacheable(value = "soilRecommendations", key = "#fieldId")
    public Map<String, Double> fetchSoilBasedRecommendations(Long fieldId, SoilData soilData, SeasonalWeatherDto weather) {
        if (soilData == null) {
            log.warn("No soil data available for recommendations, fieldId={}", fieldId);
            return new HashMap<>();
        }

        try {
            Double avgTemp = weather != null && weather.avgTempJunJul() != null ? weather.avgTempJunJul() : null;
            Double totalPrecipitation = weather != null
                    ? (weather.precipAprMay() != null ? weather.precipAprMay() : 0.0)
                    + (weather.precipJunJul() != null ? weather.precipJunJul() : 0.0)
                    + (weather.precipAugSep() != null ? weather.precipAugSep() : 0.0)
                    : null;

            SoilCropRecommendationRequest request = new SoilCropRecommendationRequest(
                    soilData.getNitrogenN(),
                    soilData.getPhosphorusP(),
                    soilData.getPotassiumK(),
                    avgTemp,
                    null,
                    soilData.getPhLevel(),
                    totalPrecipitation
            );

            SoilCropRecommendationResponse response = mlWebClient.post()
                    .uri("/crop/recommend")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(SoilCropRecommendationResponse.class)
                    .block();

            if (response != null && response.top3() != null) {
                Map<String, Double> scores = new HashMap<>();
                for (SoilCropRecommendationResponse.CropProbability cp : response.top3()) {
                    scores.put(cp.crop().toLowerCase().replace(" ", "_"), cp.probability());
                }
                return scores;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch soil-based crop recommendations for fieldId={}: {}", fieldId, e.getMessage());
        }

        return new HashMap<>();
    }

    // TTL 12 часов — задан в CacheConfig
    @Cacheable(value = "yieldPredictions", key = "#regionCode + ':' + #cropCode + ':' + #year + ':' + (#weather == null ? 'null' : '' + #weather.precipOctMar() + '|' + #weather.precipAprMay() + '|' + #weather.precipJunJul() + '|' + #weather.precipAugSep() + '|' + #weather.tempSumAprMay() + '|' + #weather.tempSumJunJul() + '|' + #weather.tempSumAugSep())")
    public Double fetchPredictedYield(String regionCode, String cropCode, int year, SeasonalWeatherDto weather) {
        String resolvedRegionCode = regionCode != null ? regionCode : DEFAULT_REGION_CODE;
        if (regionCode == null) {
            log.warn("Region code not resolved for crop={}, year={} — using default '{}'. Yield prediction may be inaccurate.",
                    cropCode, year, DEFAULT_REGION_CODE);
        }

        YieldPredictionRequest request = new YieldPredictionRequest(
                resolvedRegionCode,
                cropCode,
                year,
                weather != null ? weather.precipOctMar() : null,
                weather != null ? weather.precipAprMay() : null,
                weather != null ? weather.precipJunJul() : null,
                weather != null ? weather.precipAugSep() : null,
                weather != null ? weather.tempSumAprMay() : null,
                weather != null ? weather.tempSumJunJul() : null,
                weather != null ? weather.tempSumAugSep() : null,
                null, null,
                null, null, null, null,
                LocalDate.now().toString()
        );

        try {
            YieldPredictionResponse response = mlWebClient.post()
                    .uri("/yield/predict")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(YieldPredictionResponse.class)
                    .block();
            return response != null ? response.predictedYield() : null;
        } catch (Exception e) {
            log.warn("Failed to fetch yield prediction for crop {}: {}", cropCode, e.getMessage());
            return null;
        }
    }

    // TTL 24 часа — задан в CacheConfig
    @Cacheable(value = "priceHistory", key = "#region + ':' + #cropCode")
    public PriceHistoryResponse fetchPriceHistory(String region, String cropCode) {
        try {
            return mlWebClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/price/history")
                            .queryParam("region", region)
                            .queryParam("crop", cropCode)
                            .build())
                    .retrieve()
                    .bodyToMono(PriceHistoryResponse.class)
                    .block();
        } catch (Exception e) {
            log.warn("Failed to fetch price history for {} {}: {}", region, cropCode, e.getMessage());
            return null;
        }
    }

    // TTL 12 часов — задан в CacheConfig
    @Cacheable(value = "pricePredictions", key = "#region + ':' + #cropCode + ':' + #targetYear")
    public Double fetchPredictedPrice(String region, String cropCode, Integer targetYear) {
        String resolvedRegion = region != null ? region : DEFAULT_REGION_NAME;
        if (region == null) {
            log.warn("Region name not resolved for crop={}, year={} — using default '{}'. Price prediction may be inaccurate.",
                    cropCode, targetYear, DEFAULT_REGION_NAME);
        }

        String priceCropCode = YIELD_TO_PRICE_CROP_CODE.get(cropCode);
        if (priceCropCode == null) {
            log.debug("No price data available for crop code '{}' — skipping price prediction", cropCode);
            return null;
        }

        PriceHistoryResponse history = fetchPriceHistory(resolvedRegion, priceCropCode);

        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("region", resolvedRegion);
            requestBody.put("crop", priceCropCode);
            requestBody.put("year", targetYear);
            int harvestMonth = CROP_HARVEST_MONTH.getOrDefault(priceCropCode, 8);
            requestBody.put("month", harvestMonth);

            if (history != null && history.found()) {
                if (history.priceLag1() != null)  requestBody.put("price_lag1",  history.priceLag1());
                if (history.priceLag12() != null) requestBody.put("price_lag12", history.priceLag12());
                if (history.priceLag24() != null) requestBody.put("price_lag24", history.priceLag24());
                if (history.priceMa3() != null)   requestBody.put("price_ma3",   history.priceMa3());
                if (history.priceMa12() != null)  requestBody.put("price_ma12",  history.priceMa12());
                if (history.priceMom() != null)   requestBody.put("price_mom",   history.priceMom());
                if (history.priceYoy() != null)   requestBody.put("price_yoy",   history.priceYoy());
            }

            PricePredictionResponse response = mlWebClient.post()
                    .uri("/price/predict")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(PricePredictionResponse.class)
                    .block();
            return response != null ? response.predictedPrice() : null;
        } catch (Exception e) {
            log.warn("Failed to fetch price prediction for crop {}: {}", cropCode, e.getMessage());
            return null;
        }
    }
}
