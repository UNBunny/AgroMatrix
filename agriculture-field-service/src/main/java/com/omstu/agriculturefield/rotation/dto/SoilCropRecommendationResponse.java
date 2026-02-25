package com.omstu.agriculturefield.rotation.dto;

import java.util.List;

public record SoilCropRecommendationResponse(
        String recommendedCrop,
        Double confidence,
        List<CropProbability> top3
) {
    public record CropProbability(
            String crop,
            Double probability
    ) {}
}
