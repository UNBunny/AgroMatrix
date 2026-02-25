package com.omstu.agriculturefield.rotation.dto;

public record SowingWindow(
        String earliestDate,
        String latestDate,
        String optimalDateFrom,
        String optimalDateTo,
        boolean forecastAdjusted,
        String forecastNote,
        String climateNote
) {}
