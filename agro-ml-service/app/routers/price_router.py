from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from schemas.price_schemas import PriceRequest, PriceResponse, PriceHistoryResponse, PriceTimeSeriesResponse
from predictors import price_predictor
from cache import redis_cache

router = APIRouter(prefix="/api/price", tags=["Price"])


@router.post("/predict", response_model=PriceResponse, summary="Predict crop price rub/ton")
@redis_cache(name="price_predict", ttl_seconds=43200)  # 12 ч
def predict(req: PriceRequest):
    explicit_lags = {k: v for k, v in {
        "price_lag1":  req.price_lag1,
        "price_lag12": req.price_lag12,
        "price_lag24": req.price_lag24,
        "price_ma3":   req.price_ma3,
        "price_ma12":  req.price_ma12,
        "price_mom":   req.price_mom,
        "price_yoy":   req.price_yoy,
    }.items() if v is not None}

    # Без реальных лагов модель даёт бессмысленный результат — возвращаем null
    if not explicit_lags:
        try:
            history = price_predictor.get_price_history(region=req.region, crop=req.crop)
            if not history.get("found", False):
                return PriceResponse(
                    region=req.region,
                    crop=req.crop,
                    year=req.year,
                    month=req.month,
                    predicted_price_rub_per_ton=None,
                )
        except Exception:
            pass  # fall through to normal prediction if history check fails

    try:
        val = price_predictor.predict_price(
            region=req.region,
            crop=req.crop,
            year=req.year,
            month=req.month,
            price_history=explicit_lags or None,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return PriceResponse(
        region=req.region,
        crop=req.crop,
        year=req.year,
        month=req.month,
        predicted_price_rub_per_ton=round(val, 2),
    )


@router.get("/history", response_model=PriceHistoryResponse, summary="Get real price lags from historical CSV for a region+crop")
@redis_cache(name="price_history", ttl_seconds=86400)  # 24 ч — CSV меняется редко
def price_history(
    region: str = Query(..., examples=["Омская область"]),
    crop: str   = Query(..., examples=["wheat"]),
):
    try:
        result = price_predictor.get_price_history(region=region, crop=crop)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/regions", summary="List all regions available in price history")
def list_regions():
    try:
        return price_predictor.get_regions()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/crops", summary="List all crops available in price history")
def list_crops():
    try:
        return price_predictor.get_crops()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/info", summary="Price model metadata and CV metrics")
def model_info():
    try:
        return price_predictor.get_model_info()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/timeseries", response_model=PriceTimeSeriesResponse, summary="Get full price timeseries for a region+crop (all years)")
def price_timeseries(
    region: str = Query(..., examples=["Омская область"]),
    crop: str   = Query(..., examples=["wheat"]),
):
    try:
        result = price_predictor.get_price_timeseries(region=region, crop=crop)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
