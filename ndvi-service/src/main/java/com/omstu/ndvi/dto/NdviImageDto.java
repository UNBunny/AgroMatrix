package com.omstu.ndvi.dto;

import java.util.List;

public record NdviImageDto(
        String imageUrl,
        List<Double> bbox,       // [west, south, east, north]
        Double ndviMean,
        Double ndviMin,
        Double ndviMax,
        String actualDate,
        Integer imagesFound,
        String error
) {}
