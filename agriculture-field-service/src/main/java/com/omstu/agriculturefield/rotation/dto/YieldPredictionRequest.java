package com.omstu.agriculturefield.rotation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record YieldPredictionRequest(
        @NotBlank @JsonProperty("region_code") String regionCode,
        @NotBlank String crop,
        // год посева — разумный диапазон
        @Min(1990) @Max(2100) int year,
        // осадки по сезонам в мм — не могут быть отрицательными
        @DecimalMin("0.0") @JsonProperty("precip_oct_mar") Double precipOctMar,
        @DecimalMin("0.0") @JsonProperty("precip_apr_may") Double precipAprMay,
        @DecimalMin("0.0") @JsonProperty("precip_jun_jul") Double precipJunJul,
        @DecimalMin("0.0") @JsonProperty("precip_aug_sep") Double precipAugSep,
        @JsonProperty("temp_sum_apr_may") Double tempSumAprMay,
        @JsonProperty("temp_sum_jun_jul") Double tempSumJunJul,
        @JsonProperty("temp_sum_aug_sep") Double tempSumAugSep,
        @JsonProperty("drought_index") Double droughtIndex,
        @JsonProperty("weather_favorability") Double weatherFavorability,
        // лаги и скользящие средние по урожайности — могут быть null если нет истории
        @DecimalMin("0.0") @JsonProperty("yield_lag1") Double yieldLag1,
        @DecimalMin("0.0") @JsonProperty("yield_lag2") Double yieldLag2,
        @DecimalMin("0.0") @JsonProperty("yield_ma3") Double yieldMa3,
        @DecimalMin("0.0") @JsonProperty("yield_ma5") Double yieldMa5,
        // дата "на сегодня" — для определения закрытых погодных периодов в ML
        @JsonProperty("as_of_date") String asOfDate
) {}
