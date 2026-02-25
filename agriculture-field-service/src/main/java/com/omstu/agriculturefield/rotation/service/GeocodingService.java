package com.omstu.agriculturefield.rotation.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

// Резольвинг региона по GPS-координатам через Nominatim (OSM), API-ключ не нужен
@Service
@Slf4j
public class GeocodingService {

    private static final String NOMINATIM_URL = "https://nominatim.openstreetmap.org";

    private final WebClient nominatimClient = WebClient.builder()
            .baseUrl(NOMINATIM_URL)
            .defaultHeader("User-Agent", "AgroPlanPro/2.0 (agroplanning@example.com)")
            .build();

    public String resolveRegionName(double lat, double lon) {
        try {
            NominatimResponse resp = nominatimClient.get()
                    .uri(u -> u.path("/reverse")
                            .queryParam("lat", lat)
                            .queryParam("lon", lon)
                            .queryParam("format", "json")
                            .queryParam("zoom", 5)
                            .queryParam("accept-language", "ru")
                            .build())
                    .retrieve()
                    .bodyToMono(NominatimResponse.class)
                    .block(Duration.ofSeconds(5));

            if (resp != null && resp.address != null) {
                String state = resp.address.state;
                if (state != null && !state.isBlank()) {
                    return normalizeRegionName(state);
                }
            }
        } catch (Exception e) {
            log.warn("Nominatim reverse geocoding failed for ({}, {}): {}", lat, lon, e.getMessage());
        }
        return null;
    }

    public String resolveRegionCode(String regionName) {
        if (regionName == null) return null;
        return REGION_NAME_TO_CODE.getOrDefault(regionName, null);
    }

    // Nominatim может вернуть название в любом порядке слов — приводим к нормальному виду
    private String normalizeRegionName(String state) {
        for (String known : REGION_NAME_TO_CODE.keySet()) {
            if (state.equalsIgnoreCase(known)) return known;
        }
        for (String known : REGION_NAME_TO_CODE.keySet()) {
            String s = state.toLowerCase();
            String k = known.toLowerCase();
            String[] parts = k.split("\\s+");
            boolean allPresent = true;
            for (String p : parts) {
                if (!s.contains(p)) { allPresent = false; break; }
            }
            if (allPresent) return known;
        }
        log.debug("No exact region match for Nominatim state='{}', returning as-is", state);
        return state;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record NominatimResponse(
            @JsonProperty("address") Address address
    ) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        record Address(
                @JsonProperty("state") String state
        ) {}
    }

    private static final Map<String, String> REGION_NAME_TO_CODE = Map.ofEntries(
            Map.entry("Республика Адыгея", "AD"),
            Map.entry("Республика Алтай", "AL"),
            Map.entry("Алтайский край", "ALT"),
            Map.entry("Амурская область", "AMU"),
            Map.entry("Архангельская область", "ARK"),
            Map.entry("Астраханская область", "AST"),
            Map.entry("Республика Башкортостан", "BA"),
            Map.entry("Белгородская область", "BEL"),
            Map.entry("Брянская область", "BRY"),
            Map.entry("Республика Бурятия", "BU"),
            Map.entry("Владимирская область", "VLA"),
            Map.entry("Волгоградская область", "VGG"),
            Map.entry("Вологодская область", "VLG"),
            Map.entry("Воронежская область", "VOR"),
            Map.entry("Республика Дагестан", "DA"),
            Map.entry("Еврейская автономная область", "YEV"),
            Map.entry("Забайкальский край", "ZAB"),
            Map.entry("Ивановская область", "IVA"),
            Map.entry("Республика Ингушетия", "IN"),
            Map.entry("Иркутская область", "IRK"),
            Map.entry("Кабардино-Балкарская Республика", "KB"),
            Map.entry("Калининградская область", "KGD"),
            Map.entry("Республика Калмыкия", "KL"),
            Map.entry("Калужская область", "KLU"),
            Map.entry("Камчатский край", "KAM"),
            Map.entry("Карачаево-Черкесская Республика", "KC"),
            Map.entry("Республика Карелия", "KR"),
            Map.entry("Кемеровская область", "KEM"),
            Map.entry("Кировская область", "KIR"),
            Map.entry("Республика Коми", "KO"),
            Map.entry("Костромская область", "KOS"),
            Map.entry("Краснодарский край", "KRD"),
            Map.entry("Красноярский край", "KYA"),
            Map.entry("Республика Крым", "CR"),
            Map.entry("Курганская область", "KGN"),
            Map.entry("Курская область", "KRS"),
            Map.entry("Ленинградская область", "LEN"),
            Map.entry("Липецкая область", "LIP"),
            Map.entry("Магаданская область", "MAG"),
            Map.entry("Республика Марий Эл", "ME"),
            Map.entry("Республика Мордовия", "MO"),
            Map.entry("Московская область", "MOS"),
            Map.entry("Мурманская область", "MUR"),
            Map.entry("Нижегородская область", "NIZ"),
            Map.entry("Новгородская область", "NGR"),
            Map.entry("Новосибирская область", "NVS"),
            Map.entry("Омская область", "OMS"),
            Map.entry("Оренбургская область", "ORE"),
            Map.entry("Орловская область", "ORL"),
            Map.entry("Пензенская область", "PNZ"),
            Map.entry("Пермский край", "PER"),
            Map.entry("Приморский край", "PRI"),
            Map.entry("Псковская область", "PSK"),
            Map.entry("Ростовская область", "ROS"),
            Map.entry("Рязанская область", "RYA"),
            Map.entry("Самарская область", "SAM"),
            Map.entry("Саратовская область", "SAR"),
            Map.entry("Республика Саха (Якутия)", "SA"),
            Map.entry("Сахалинская область", "SAK"),
            Map.entry("Свердловская область", "SVE"),
            Map.entry("Республика Северная Осетия — Алания", "SE"),
            Map.entry("Смоленская область", "SMO"),
            Map.entry("Ставропольский край", "STA"),
            Map.entry("Тамбовская область", "TAM"),
            Map.entry("Республика Татарстан", "TA"),
            Map.entry("Тверская область", "TVE"),
            Map.entry("Томская область", "TOM"),
            Map.entry("Тульская область", "TUL"),
            Map.entry("Республика Тыва", "TY"),
            Map.entry("Тюменская область", "TYU"),
            Map.entry("Удмуртская Республика", "UD"),
            Map.entry("Ульяновская область", "ULY"),
            Map.entry("Хабаровский край", "KHA"),
            Map.entry("Республика Хакасия", "KK"),
            Map.entry("Челябинская область", "CHE"),
            Map.entry("Чеченская Республика", "CE"),
            Map.entry("Чувашская Республика", "CU"),
            Map.entry("Ямало-Ненецкий автономный округ", "YAN"),
            Map.entry("Ярославская область", "YAR")
    );
}
