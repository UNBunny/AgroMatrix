from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    """camelCase (Java) и snake_case одновременно."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RiskLevel(str, Enum):
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class CropProtectionEntryDto(_CamelModel):
    id: int
    crop_code: str
    disease_name: str
    pathogen_latin: Optional[str] = None
    disease_type: str
    product_name: str
    frac_group: Optional[str] = None
    frac_code: Optional[str] = None
    active_ingredients: str
    ai_concentration: Optional[str] = None
    application_type: str
    bbch_from: Optional[int] = None
    bbch_to: Optional[int] = None
    bbch_note: Optional[str] = None
    dose_rate: str
    dose_value: Optional[float] = None
    dose_unit: Optional[str] = None
    temp_min_c: Optional[float] = None
    temp_opt_c: Optional[float] = None
    temp_max_c: Optional[float] = None
    phi_days: int = 0
    notes: Optional[str] = None


class WeatherWindowDto(_CamelModel):
    avg_temp_48h: Optional[float] = None
    max_temp_48h: Optional[float] = None
    min_temp_48h: Optional[float] = None
    avg_humidity_48h: Optional[float] = None
    total_precip_48h: Optional[float] = None
    leaf_wetness_duration_hours: Optional[float] = None
    forecast_temp_24h: Optional[float] = None
    forecast_humidity_24h: Optional[float] = None
    forecast_precip_24h: Optional[float] = None
    rain_expected_in_3h: Optional[bool] = None
    forecast_max_temp_24h: Optional[float] = None
    data_source: Optional[str] = None


class NdviSnapshotDto(_CamelModel):
    current_ndvi: Optional[float] = None
    current_date: Optional[str] = None
    baseline_ndvi: Optional[float] = None
    ndvi_delta: Optional[float] = None
    source: Optional[str] = None


class ThreatAnalysisRequest(_CamelModel):
    field_id: int
    crop_code: str
    bbch_stage: int
    target_diseases: List[str] = Field(default_factory=list)
    weather_data: WeatherWindowDto
    ndvi_data: NdviSnapshotDto
    catalog_entries: List[CropProtectionEntryDto]


class ThreatRecommendation(BaseModel):
    product_name: str
    frac_code: Optional[str] = None
    frac_group: Optional[str] = None
    active_ingredients: str
    dose_rate: str
    dose_value: Optional[float] = None
    dose_unit: Optional[str] = None
    bbch_from: Optional[int] = None
    bbch_to: Optional[int] = None
    temp_min_c: Optional[float] = None
    temp_max_c: Optional[float] = None
    phi_days: int = 0
    rationale: str
    disease_name: str


class ThreatAnalysisResponse(BaseModel):
    risk_level: RiskLevel
    infection_index: float
    ndvi_corrected_index: float
    nitrogen_overload_warning: Optional[str] = None
    active_threats: List[str]
    recommendations: List[ThreatRecommendation]
    fracs_used_recently: List[str] = Field(default_factory=list)
    analysis_notes: str
