from fastapi import APIRouter, HTTPException, Query
from schemas.yield_schemas import (
    YieldRequest, YieldResponse,
    ChainedForecastRequest, ChainedForecastResponse,
    RegionForecastItem, RegionForecastResponse,
    RegionsBulkRequest,
)
from predictors import yield_predictor

router = APIRouter(prefix="/api/yield", tags=["Yield"])


@router.post("/predict", response_model=YieldResponse, summary="Predict yield for one region-crop-year")
def predict(req: YieldRequest):
    try:
        result = yield_predictor.predict_yield_progressive(
            region_code=req.region_code,
            crop=req.crop,
            year=req.year,
            as_of_date=req.as_of_date,
            weather={k: v for k, v in {
                "precip_oct_mar": req.precip_oct_mar,
                "precip_apr_may": req.precip_apr_may,
                "precip_jun_jul": req.precip_jun_jul,
                "precip_aug_sep": req.precip_aug_sep,
                "temp_sum_apr_may": req.temp_sum_apr_may,
                "temp_sum_jun_jul": req.temp_sum_jun_jul,
                "temp_sum_aug_sep": req.temp_sum_aug_sep,
                "drought_index": req.drought_index,
                "weather_favorability": req.weather_favorability,
            }.items() if v is not None} or None,
            history={k: v for k, v in {
                "yield_lag1": req.yield_lag1,
                "yield_lag2": req.yield_lag2,
                "yield_ma3":  req.yield_ma3,
                "yield_ma5":  req.yield_ma5,
            }.items() if v is not None} or None,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return YieldResponse(
        region_code=req.region_code,
        crop=req.crop,
        year=req.year,
        predicted_yield_centners_per_ha=round(result["value"], 2),
        weather_completeness_pct=result["weather_completeness_pct"],
        periods_observed=result["periods_observed"],
        periods_estimated=result["periods_estimated"],
        as_of_date=result["as_of_date"],
    )


@router.post("/forecast/chained", response_model=ChainedForecastResponse,
             summary="Chained multi-year forecast (each year uses previous prediction as lag)")
def forecast_chained(req: ChainedForecastRequest):
    try:
        result = yield_predictor.predict_yield_chained(
            region_code=req.region_code,
            crop=req.crop,
            years=req.years,
            known_yields={int(k): v for k, v in (req.known_yields or {}).items()},
            weather=req.weather,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ChainedForecastResponse(
        region_code=req.region_code,
        crop=req.crop,
        forecast={str(k): v for k, v in result.items()},
    )


@router.get("/info", summary="Yield model metadata and CV metrics")
def model_info():
    try:
        return yield_predictor.get_model_info()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get(
    "/regions",
    response_model=RegionForecastResponse,
    summary="Bulk yield+price forecast for all regions — crop × year",
    description=(
        "Loops over all regions in harvest_master.csv for the given crop and year, "
        "returns predicted yield, MA5, delta%, price (harvest month) and a market signal. "
        "Results are cached in-memory for 1 hour."
    ),
)
def regions_forecast(
    crop: str = Query(..., example="spring_wheat", description="Crop name (snake_case)"),
    year: int = Query(..., example=2026, description="Target forecast year"),
    precip_oct_mar:   float | None = Query(None, description="Oct–Mar precipitation mm (from weather-service)"),
    precip_apr_may:   float | None = Query(None, description="Apr–May precipitation mm"),
    precip_jun_jul:   float | None = Query(None, description="Jun–Jul precipitation mm"),
    precip_aug_sep:   float | None = Query(None, description="Aug–Sep precipitation mm"),
    temp_sum_apr_may: float | None = Query(None, description="Apr–May heat sum °C·days"),
    temp_sum_jun_jul: float | None = Query(None, description="Jun–Jul heat sum °C·days"),
    temp_sum_aug_sep: float | None = Query(None, description="Aug–Sep heat sum °C·days"),
    temp_sum_apr_sep: float | None = Query(None, description="Apr–Sep total heat sum °C·days"),
    as_of_date: str | None = Query(None, description="ISO date YYYY-MM-DD to determine which weather periods are closed (default: today)"),
):
    if year < 2024:
        raise HTTPException(status_code=400, detail="Данные доступны только с 2024 года.")
    if year > 2027:
        raise HTTPException(status_code=400, detail="Прогноз доступен только до 2027 года включительно.")
    weather = {k: v for k, v in {
        "precip_oct_mar":   precip_oct_mar,
        "precip_apr_may":   precip_apr_may,
        "precip_jun_jul":   precip_jun_jul,
        "precip_aug_sep":   precip_aug_sep,
        "temp_sum_apr_may": temp_sum_apr_may,
        "temp_sum_jun_jul": temp_sum_jun_jul,
        "temp_sum_aug_sep": temp_sum_aug_sep,
        "temp_sum_apr_sep": temp_sum_apr_sep,
    }.items() if v is not None} or None
    try:
        items = yield_predictor.predict_regions(crop=crop, year=year, weather=weather, as_of_date=as_of_date)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    cached = any(k[:2] == (crop, year) for k in yield_predictor._regions_cache)
    is_forecast_year = all(item.get("is_forecast", True) for item in items)
    return RegionForecastResponse(
        crop=crop,
        year=year,
        regions=[RegionForecastItem(**item) for item in items],
        cached=cached,
        is_forecast_year=is_forecast_year,
    )


@router.post(
    "/regions",
    response_model=RegionForecastResponse,
    summary="Bulk yield+price forecast with per-region weather",
    description=(
        "Same as GET /regions but accepts per-region weather as a JSON body. "
        "Each region can have its own seasonal weather dict, improving forecast accuracy."
    ),
)
def regions_forecast_bulk(req: RegionsBulkRequest):
    if req.year < 2024:
        raise HTTPException(status_code=400, detail="Данные доступны только с 2024 года.")
    if req.year > 2027:
        raise HTTPException(status_code=400, detail="Прогноз доступен только до 2027 года включительно.")

    per_region_weather: dict[str, dict] | None = None
    if req.per_region_weather:
        per_region_weather = {
            code: {k: v for k, v in w.model_dump().items() if v is not None}
            for code, w in req.per_region_weather.items()
        }
        per_region_weather = {k: v for k, v in per_region_weather.items() if v}

    try:
        items = yield_predictor.predict_regions(
            crop=req.crop,
            year=req.year,
            as_of_date=req.as_of_date,
            per_region_weather=per_region_weather or None,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    is_forecast_year = all(item.get("is_forecast", True) for item in items)
    return RegionForecastResponse(
        crop=req.crop,
        year=req.year,
        regions=[RegionForecastItem(**item) for item in items],
        cached=False,
        is_forecast_year=is_forecast_year,
    )
