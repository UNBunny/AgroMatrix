package com.omstu.agriculturefield.rotation.service.impl;

import com.omstu.agriculturefield.disease.dto.WeatherForecastData;
import com.omstu.agriculturefield.rotation.dto.SeasonalWeatherDto;
import com.omstu.agriculturefield.rotation.dto.SowingWindow;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

// вычисляет окно посева на основе базовых агрономических норм + коррекция по ERA5 и 16-дневному прогнозу
// базовые сроки привязаны к Западной Сибири / степной зоне
@Service
@Slf4j
public class SowingDateService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    // базовые даты по Западной Сибири, формат: [earliest, optFrom, optTo, latest] (MM-DD)
    private static final Map<String, String[]> BASE_SOWING_WINDOWS = Map.ofEntries(
            // code                  earliest  optFrom   optTo     latest
            Map.entry("spring_wheat",  new String[]{"04-25", "05-05", "05-20", "06-01"}),
            Map.entry("winter_wheat",  new String[]{"08-20", "08-25", "09-10", "09-20"}),
            Map.entry("spring_barley", new String[]{"04-25", "05-01", "05-15", "05-28"}),
            Map.entry("winter_barley", new String[]{"08-15", "08-20", "09-05", "09-15"}),
            Map.entry("corn",          new String[]{"05-05", "05-10", "05-25", "06-05"}),
            Map.entry("sunflower",     new String[]{"05-01", "05-05", "05-20", "06-01"}),
            Map.entry("rapeseed",      new String[]{"05-01", "05-05", "05-15", "05-25"}),
            Map.entry("peas",          new String[]{"04-25", "05-01", "05-15", "05-28"}),
            Map.entry("buckwheat",     new String[]{"05-20", "05-25", "06-05", "06-15"}),
            Map.entry("flax",          new String[]{"05-01", "05-05", "05-20", "06-01"}),
            Map.entry("oat",           new String[]{"04-25", "05-01", "05-15", "05-28"}),
            Map.entry("rye",           new String[]{"04-25", "05-01", "05-15", "05-28"}),
            Map.entry("winter_rye",    new String[]{"08-20", "08-25", "09-10", "09-20"}),
            Map.entry("soybean",       new String[]{"05-10", "05-15", "05-28", "06-05"}),
            Map.entry("millet",        new String[]{"05-15", "05-20", "06-01", "06-10"})
    );

    // мин. т-ра почвы для посева — используется при коррекции по прогнозу
    private static final Map<String, Double> MIN_SOIL_TEMP = Map.ofEntries(
            Map.entry("spring_wheat",  5.0),
            Map.entry("winter_wheat",  3.0),
            Map.entry("spring_barley", 5.0),
            Map.entry("winter_barley", 3.0),
            Map.entry("corn",          10.0),
            Map.entry("sunflower",     8.0),
            Map.entry("rapeseed",      5.0),
            Map.entry("peas",          4.0),
            Map.entry("buckwheat",     12.0),
            Map.entry("flax",          5.0),
            Map.entry("oat",           5.0),
            Map.entry("rye",           3.0),
            Map.entry("winter_rye",    3.0),
            Map.entry("soybean",       10.0),
            Map.entry("millet",        12.0)
    );

    public SowingWindow computeSowingWindow(String cropCode, int targetYear,
                                            SeasonalWeatherDto climate,
                                            WeatherForecastData forecast) {

        String[] base = BASE_SOWING_WINDOWS.get(cropCode);
        if (base == null) {
            return buildUnknownWindow(targetYear);
        }

        LocalDate earliest    = parseDate(targetYear, base[0]);
        LocalDate optimalFrom = parseDate(targetYear, base[1]);
        LocalDate optimalTo   = parseDate(targetYear, base[2]);
        LocalDate latest      = parseDate(targetYear, base[3]);

        StringBuilder climateNote = new StringBuilder();
        boolean isWinter = cropCode.startsWith("winter_");

        // ── Climate-based adjustment (historical) ─────────────────────────
        if (climate != null && !isWinter) {
            boolean frostRisk = Boolean.TRUE.equals(climate.frostRiskSpring());
            Double minTempVeg = climate.minTempVegetation();

            if (frostRisk || (minTempVeg != null && minTempVeg < 2.0)) {
                int delayDays = frostRisk ? 5 : 3;
                earliest    = earliest.plusDays(delayDays);
                optimalFrom = optimalFrom.plusDays(delayDays);
                optimalTo   = optimalTo.plusDays(delayDays);
                latest      = latest.plusDays(delayDays);
                climateNote.append(String.format(
                        "Исторически высок риск весенних заморозков (мин. T=%.1f°C) — сроки сдвинуты на +%d дней. ",
                        minTempVeg != null ? minTempVeg : 0.0, delayDays));
            }

            if (climate.tempSumAprMay() != null && climate.tempSumAprMay() < 280) {
                climateNote.append("Весна холоднее нормы — рекомендуем не торопиться с посевом. ");
            } else if (climate.tempSumAprMay() != null && climate.tempSumAprMay() > 400) {
                earliest    = earliest.minusDays(3);
                optimalFrom = optimalFrom.minusDays(3);
                climateNote.append("Весна тёплая (сумма T апр-май > 400°С·дней) — можно сеять на 2–3 дня раньше. ");
            }
        }

        // ── Forecast-based adjustment (16-day) ────────────────────────────
        boolean forecastAdjusted = false;
        StringBuilder forecastNote = new StringBuilder();

        if (forecast != null && !isWinter) {
            Double minTempForecast = forecast.minTempRecord();
            Double soilReqTemp = MIN_SOIL_TEMP.getOrDefault(cropCode, 5.0);

            if (minTempForecast != null && minTempForecast < soilReqTemp - 2.0) {
                int delay = (int) Math.min(7, Math.ceil((soilReqTemp - minTempForecast) * 1.5));
                earliest    = earliest.plusDays(delay);
                optimalFrom = optimalFrom.plusDays(delay);
                optimalTo   = optimalTo.plusDays(Math.max(1, delay - 2));
                forecastAdjusted = true;
                forecastNote.append(String.format(
                        "Прогноз на 16 дней: мин. температура %.1f°C ниже порога посева (%.0f°C) — сроки сдвинуты на +%d дней.",
                        minTempForecast, soilReqTemp, delay));
            } else if (minTempForecast != null && minTempForecast >= soilReqTemp + 3.0) {
                earliest    = earliest.minusDays(2);
                optimalFrom = optimalFrom.minusDays(2);
                forecastAdjusted = true;
                forecastNote.append(String.format(
                        "Прогноз на 16 дней: температура выше нормы (мин. %.1f°C) — возможен ранний посев.",
                        minTempForecast));
            } else {
                forecastNote.append("Прогноз на 16 дней: условия в норме для запланированных сроков посева.");
            }
        } else if (isWinter) {
            climateNote.append("Озимая культура — базовые агрономические сроки для Западной Сибири.");
        } else {
            forecastNote.append("Прогноз погоды недоступен — используются климатические нормы.");
        }

        // Guard: ensure ordering is preserved after adjustments
        if (optimalFrom.isBefore(earliest)) optimalFrom = earliest;
        if (optimalTo.isBefore(optimalFrom)) optimalTo = optimalFrom.plusDays(5);
        if (latest.isBefore(optimalTo))      latest     = optimalTo.plusDays(5);

        return new SowingWindow(
                earliest.format(DATE_FMT),
                latest.format(DATE_FMT),
                optimalFrom.format(DATE_FMT),
                optimalTo.format(DATE_FMT),
                forecastAdjusted,
                forecastNote.toString().isBlank() ? null : forecastNote.toString().trim(),
                climateNote.toString().isBlank() ? null : climateNote.toString().trim()
        );
    }

    private LocalDate parseDate(int year, String mmdd) {
        return LocalDate.parse(year + "-" + mmdd, DATE_FMT);
    }

    private SowingWindow buildUnknownWindow(int year) {
        return new SowingWindow(
                year + "-05-01",
                year + "-06-01",
                year + "-05-10",
                year + "-05-25",
                false,
                null,
                "Культура не распознана — указаны типовые сроки для яровых культур Западной Сибири."
        );
    }
}
