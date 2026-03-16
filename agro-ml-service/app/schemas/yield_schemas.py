from typing import Optional
from pydantic import BaseModel, Field


class YieldRequest(BaseModel):
    region_code: str = Field(..., example="ALT", description="Region code (e.g. ALT, KDA, ROS)")
    crop: str        = Field(..., example="winter_wheat", description="Crop name (snake_case)")
    year: int        = Field(..., example=2025)

    # Optional weather — if omitted, model uses historical means
    precip_oct_mar: Optional[float] = Field(None, description="Oct–Mar precipitation mm")
    precip_apr_may: Optional[float] = Field(None, description="Apr–May precipitation mm")
    precip_jun_jul: Optional[float] = Field(None, description="Jun–Jul precipitation mm")
    precip_aug_sep: Optional[float] = Field(None, description="Aug–Sep precipitation mm")
    temp_sum_apr_may: Optional[float] = Field(None, description="Apr–May heat sum °C·days")
    temp_sum_jun_jul: Optional[float] = Field(None, description="Jun–Jul heat sum °C·days")
    temp_sum_aug_sep: Optional[float] = Field(None, description="Aug–Sep heat sum °C·days")
    drought_index: Optional[float] = None
    weather_favorability: Optional[float] = None

    # Optional yield history — if omitted, model uses dataset medians
    yield_lag1: Optional[float] = Field(None, description="Actual yield t-1 (centners/ha)")
    yield_lag2: Optional[float] = Field(None, description="Actual yield t-2")
    yield_ma3:  Optional[float] = Field(None, description="3-year trailing MA")
    yield_ma5:  Optional[float] = Field(None, description="5-year trailing MA")

    # Progressive refinement — date used to determine which weather periods are closed
    as_of_date: Optional[str] = Field(
        None,
        description="ISO 8601 date (YYYY-MM-DD). Defaults to today. "
                    "Determines which seasonal weather periods are 'known'. "
                    "Pass actual weather values for closed periods to improve accuracy.",
        example="2026-04-27",
    )


class YieldResponse(BaseModel):
    region_code: str
    crop: str
    year: int
    predicted_yield_centners_per_ha: float
    model_version: str = "lgbm-v2"
    weather_completeness_pct: Optional[int] = Field(
        None,
        description="% of core weather features from real observations (0 = all climate normals, 100 = all real data)"
    )
    periods_observed: list[str] = Field(
        default_factory=list,
        description="Seasonal periods where real weather data was provided",
    )
    periods_estimated: list[str] = Field(
        default_factory=list,
        description="Seasonal periods using 10-year climatological normals",
    )
    as_of_date: Optional[str] = Field(None, description="Date used for period resolution")


class ChainedForecastRequest(BaseModel):
    region_code: str = Field(..., example="ALT")
    crop: str        = Field(..., example="winter_wheat")
    years: list[int] = Field(..., example=[2024, 2025, 2026])
    known_yields: Optional[dict[int, float]] = Field(
        None,
        example={2023: 26.1, 2024: 28.5},
        description="Known historical yields {year: centners_per_ha} to seed lag features",
    )
    weather: Optional[dict[str, float]] = Field(
        None, description="Weather override applied to all forecast years"
    )


class ChainedForecastResponse(BaseModel):
    region_code: str
    crop: str
    forecast: dict[int, float] = Field(description="{year: predicted_centners_per_ha}")
    note: str = "Chained forecast: each year uses the previous prediction as yield_lag1"


class RegionForecastItem(BaseModel):
    region_code: str
    region_name: str
    yield_pred: float = Field(description="Predicted yield centners/ha")
    yield_ma5: Optional[float] = Field(None, description="5-year trailing MA from history")
    delta_pct: Optional[float] = Field(None, description="% deviation from yield_ma5")
    price_pred: Optional[float] = Field(None, description="Predicted price rub/ton (harvest month)")
    signal: str = Field(description="SURPLUS | NEUTRAL | DEFICIT | UNKNOWN")
    sown_area_thou_ha: Optional[float] = Field(None, description="Last known sown area in thousand ha")
    is_forecast: bool = Field(True, description="False = actual historical data, True = ML prediction")


class RegionForecastResponse(BaseModel):
    crop: str
    year: int
    regions: list[RegionForecastItem]
    cached: bool = False
    is_forecast_year: bool = Field(True, description="False if year has real data in the dataset")


class RegionWeatherItem(BaseModel):
    precip_oct_mar:   Optional[float] = None
    precip_apr_may:   Optional[float] = None
    precip_jun_jul:   Optional[float] = None
    precip_aug_sep:   Optional[float] = None
    temp_sum_apr_may: Optional[float] = None
    temp_sum_jun_jul: Optional[float] = None
    temp_sum_aug_sep: Optional[float] = None
    temp_sum_apr_sep: Optional[float] = None


class RegionsBulkRequest(BaseModel):
    crop: str = Field(..., example="spring_wheat")
    year: int = Field(..., example=2026)
    as_of_date: Optional[str] = Field(None, description="ISO date YYYY-MM-DD (default: today)")
    per_region_weather: dict[str, RegionWeatherItem] = Field(
        default_factory=dict,
        description="Per-region weather: {region_code: {precip_oct_mar, …}}",
    )
