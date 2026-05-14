from typing import Optional
from pydantic import BaseModel, Field


class PriceRequest(BaseModel):
    region: str  = Field(..., example="Алтайский край")
    crop: str    = Field(..., example="wheat")
    year: int    = Field(..., example=2025)
    month: int   = Field(..., ge=1, le=12, example=8)

    # Optional price history
    price_lag1:  Optional[float] = Field(None, description="Price 1 month ago (rub/ton)")
    price_lag12: Optional[float] = Field(None, description="Price 12 months ago")
    price_lag24: Optional[float] = Field(None, description="Price 24 months ago")
    price_ma3:   Optional[float] = Field(None, description="3-month trailing MA")
    price_ma12:  Optional[float] = Field(None, description="12-month trailing MA")
    price_mom:   Optional[float] = Field(None, description="Month-over-month change %")
    price_yoy:   Optional[float] = Field(None, description="Year-over-year change %")


class PriceResponse(BaseModel):
    region: str
    crop: str
    year: int
    month: int
    predicted_price_rub_per_ton: Optional[float] = None
    model_version: str = "lgbm-v2"


class PriceHistoryResponse(BaseModel):
    region: str
    crop: str
    last_year: int
    last_month: int
    price_lag1:  Optional[float] = None
    price_lag12: Optional[float] = None
    price_lag24: Optional[float] = None
    price_ma3:   Optional[float] = None
    price_ma12:  Optional[float] = None
    price_mom:   Optional[float] = None
    price_yoy:   Optional[float] = None
    found: bool = False


class PriceDataPoint(BaseModel):
    year: int
    month: int
    month_name: str
    price: Optional[float] = None
    price_ma3: Optional[float] = None
    price_ma12: Optional[float] = None


class PriceTimeSeriesResponse(BaseModel):
    region: str
    crop: str
    data: list[PriceDataPoint]
    years: list[int]
    found: bool = False
