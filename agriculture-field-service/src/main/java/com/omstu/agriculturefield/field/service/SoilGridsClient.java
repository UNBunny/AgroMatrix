package com.omstu.agriculturefield.field.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.netty.http.client.HttpClient;

import java.net.URI;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class SoilGridsClient {

    private static final String SOILGRIDS_BASE_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query";

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public SoilGridsClient(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10000)
                .responseTimeout(Duration.ofSeconds(30))
                .doOnConnected(conn ->
                        conn.addHandlerLast(new ReadTimeoutHandler(30, TimeUnit.SECONDS)));

        this.webClient = WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .codecs(cfg -> cfg.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * Получить агрохимические данные SoilGrids по координатам.
     * Кэшируется на {@code soilGrids} (TTL 30 дней): данные SoilGrids — статичные слои почвы,
     * меняются крайне редко (новый релиз раз в несколько лет). Округление до 3 знаков ≈ 100 м.
     */
    @Cacheable(
            cacheNames = "soilGrids",
            key = "T(java.lang.Math).round(#lat * 1000) / 1000.0 + ',' " +
                    "+ T(java.lang.Math).round(#lon * 1000) / 1000.0",
            unless = "#result == null"
    )
    public SoilGridsData fetchSoilData(double lat, double lon) {
        log.info("Fetching SoilGrids data for coordinates: {}, {}", lat, lon);

        URI uri = UriComponentsBuilder
                .fromUriString(SOILGRIDS_BASE_URL)
                .queryParam("lon", lon)
                .queryParam("lat", lat)
                .queryParam("depth", "0-5cm")
                .queryParam("depth", "5-15cm")
                .queryParam("depth", "15-30cm")
                .queryParam("value", "mean")
                .queryParam("property", "phh2o")
                .queryParam("property", "cec")
                .queryParam("property", "nitrogen")
                .queryParam("property", "soc")
                .queryParam("property", "clay")
                .queryParam("property", "sand")
                .queryParam("property", "silt")
                .queryParam("property", "bdod")
                .queryParam("property", "ocd")
                .build(true)
                .toUri();

        log.debug("SoilGrids API URL: {}", uri);

        try {
            String responseBody = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.debug("SoilGrids raw response: {}", responseBody);

            if (responseBody == null || responseBody.isEmpty()) {
                log.warn("Empty response from SoilGrids API");
                return null;
            }

            SoilGridsData parsed = parseSoilGridsResponse(responseBody, lat, lon);
            if (parsed != null && parsed.getPhLevel() == null && parsed.getNitrogenN() == null
                    && parsed.getCec() == null && parsed.getOrganicMatter() == null) {
                log.warn("SoilGrids returned no-data (all null) for {}, {}", lat, lon);
                return null;
            }
            return parsed;
        } catch (Exception e) {
            log.error("Failed to fetch SoilGrids data for {}, {}: {}", lat, lon, e.getMessage(), e);
            return null;
        }
    }

    private SoilGridsData parseSoilGridsResponse(String json, double lat, double lon) {
        try {
            JsonNode root = objectMapper.readTree(json);

            // Check for API errors
            if (root.has("detail") || root.has("error")) {
                log.error("SoilGrids API error: {}", json);
                return null;
            }

            JsonNode properties = root.path("properties");
            if (properties.isMissingNode()) {
                log.error("No 'properties' node in SoilGrids response: {}", json);
                return null;
            }

            JsonNode layers = properties.path("layers");
            if (!layers.isArray()) {
                log.error("No 'layers' array in SoilGrids response");
                return null;
            }

            SoilGridsData data = new SoilGridsData();
            data.setLat(lat);
            data.setLon(lon);

            // Extract version info
            JsonNode version = properties.path("version");
            if (!version.isMissingNode()) {
                data.setSoilgridsVersion(version.path("wrb_ver").asText("unknown"));
            } else {
                data.setSoilgridsVersion("unknown");
            }

            log.debug("Parsing {} layers from SoilGrids response", layers.size());

            for (JsonNode layer : layers) {
                String name = layer.path("name").asText();
                JsonNode depths = layer.path("depths");

                log.debug("Processing layer: {}, depths: {}", name, depths.size());

                if (!depths.isArray() || depths.size() == 0) continue;

                // Weighted average across 0-30cm: weights by layer thickness (5, 10, 15 cm)
                double weightedSum = 0.0;
                double totalWeight = 0.0;
                int[] weights = {5, 10, 15}; // thickness of 0-5cm, 5-15cm, 15-30cm
                String[] depthLabels = {"0-5cm", "5-15cm", "15-30cm"};

                for (int di = 0; di < depthLabels.length; di++) {
                    JsonNode depthNode = findDepthByLabel(depths, depthLabels[di]);
                    if (depthNode == null) continue;
                    JsonNode meanNode = depthNode.path("values").path("mean");
                    if (meanNode.isNull() || meanNode.isMissingNode()) continue;
                    double mean = meanNode.asDouble();
                    if (mean > -9990) {
                        weightedSum += mean * weights[di];
                        totalWeight += weights[di];
                    }
                }

                if (totalWeight == 0) {
                    log.warn("No valid depth values for layer {}", name);
                    continue;
                }

                double weightedMean = weightedSum / totalWeight;
                log.debug("Layer {}: weighted mean (0-30cm) = {}", name, weightedMean);

                switch (name) {
                    case "nitrogen" -> data.setNitrogenN(convertNitrogenToKgPerHa(weightedMean));
                    case "phh2o" -> data.setPhLevel(weightedMean / 10.0);
                    case "cec" -> data.setCec(weightedMean / 10.0);
                    case "bdod" -> data.setBulkDensity(weightedMean / 100.0);
                    case "soc" -> data.setOrganicMatter(weightedMean / 10.0 / 10.0 * 1.724); // dg/kg /10 -> g/kg /10 -> % OC * 1.724 -> % OM
                    case "clay" -> data.setClay(weightedMean / 10.0);
                    case "sand" -> data.setSand(weightedMean / 10.0);
                    case "silt" -> data.setSilt(weightedMean / 10.0);
                }
            }

            data.setSoilTexture(determineTextureClass(data));
            data.setConfidence(calculateConfidence(data));

            log.info("Parsed SoilGrids data for {}, {}: N={}, P={}, K={}, pH={}, texture={}",
                    lat, lon, data.getNitrogenN(), data.getPhosphorusP(), data.getPotassiumK(),
                    data.getPhLevel(), data.getSoilTexture());

            return data;
        } catch (Exception e) {
            log.error("Failed to parse SoilGrids response: {}", e.getMessage(), e);
            return null;
        }
    }

    private JsonNode findDepthByLabel(JsonNode depths, String label) {
        for (JsonNode depth : depths) {
            if (label.equals(depth.path("label").asText())) {
                return depth;
            }
        }
        return null;
    }

    private Double convertNitrogenToKgPerHa(double cgKgValue) {
        // SoilGrids nitrogen: mapped_units=cg/kg, d_factor=100 => actual g/kg = raw/100
        // Topsoil 0-30cm bulk density ~1.2 g/cm³ => soil mass = 3600 t/ha
        // N kg/ha = (cgKg/100 g/kg) / 1000 * 3,600,000 kg/ha = cgKg * 36
        if (Double.isNaN(cgKgValue) || cgKgValue < 0) return null;
        return cgKgValue * 36.0 / 1000.0; // cg/kg -> kg/ha
    }

    private String determineTextureClass(SoilGridsData data) {
        Double clay = data.getClay();
        Double sand = data.getSand();
        Double silt = data.getSilt();

        if (clay == null || sand == null || silt == null) return null;

        // USDA Soil Texture Triangle simplified classification
        if (clay >= 40) return "Clay";
        if (clay >= 27 && silt >= 28 && sand >= 20 && sand <= 45) return "Clay Loam";
        if (clay >= 27 && silt >= 28 && sand < 20) return "Silty Clay Loam";
        if (clay >= 35 && silt >= 45) return "Silty Clay";
        if (clay >= 20 && clay < 40 && silt >= 40) return "Silty Clay Loam";
        if (clay >= 20 && clay < 40 && sand >= 45) return "Sandy Clay Loam";
        if (clay >= 35 && sand >= 45) return "Sandy Clay";
        if (clay < 20 && silt >= 50) return "Silt";
        if (clay < 27 && silt >= 50) return "Silt Loam";
        if (clay < 20 && sand >= 52) return "Sandy Loam";
        if (clay < 15 && sand >= 70) return "Loamy Sand";
        if (clay < 10 && sand >= 85) return "Sand";
        return "Loam";
    }

    private Double calculateConfidence(SoilGridsData data) {
        int availableParams = 0;
        int totalParams = 6;
        if (data.getNitrogenN() != null) availableParams++;
        if (data.getPhLevel() != null) availableParams++;
        if (data.getCec() != null) availableParams++;
        if (data.getOrganicMatter() != null) availableParams++;
        if (data.getBulkDensity() != null) availableParams++;
        if (data.getSoilTexture() != null) availableParams++;

        return (availableParams / (double) totalParams) * 100.0;
    }

    // Inner class to hold parsed data
    @lombok.Data
    public static class SoilGridsData {
        private double lat;
        private double lon;
        private Double nitrogenN;
        private Double phosphorusP;
        private Double potassiumK;
        private Double phLevel;
        private Double organicMatter;
        private Double cec;
        private Double bulkDensity;
        private Double clay;
        private Double sand;
        private Double silt;
        private String soilTexture;
        private Double confidence;
        private String soilgridsVersion;
    }
}
