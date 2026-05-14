package com.omstu.ndvi.dto;

import java.util.List;

public record NdviAvailableDatesDto(
        List<String> dates,
        String error
) {}
