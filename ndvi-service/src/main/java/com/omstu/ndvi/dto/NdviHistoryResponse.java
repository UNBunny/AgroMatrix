package com.omstu.ndvi.dto;

import java.util.List;

public record NdviHistoryResponse(
        Long fieldId,
        String fieldName,
        NdviRecordDto current,
        List<NdviRecordDto> history
) {}
