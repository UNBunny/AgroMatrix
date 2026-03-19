package com.omstu.ndvi.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record NdviAvailableDatesRequest(
        @NotNull Long fieldId,
        @NotEmpty List<List<Double>> coordinates,
        @NotNull String dateStart,
        @NotNull String dateEnd
) {}
