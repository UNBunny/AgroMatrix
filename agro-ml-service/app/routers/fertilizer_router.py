from fastapi import APIRouter, HTTPException
from schemas.agro_schemas import FertilizerRequest, FertilizerResponse
from predictors import agro_predictor
from cache import redis_cache

router = APIRouter(prefix="/api/fertilizer", tags=["Agrochemistry"])


@router.post("/recommend", response_model=FertilizerResponse,
             summary="Recommend fertilizer by crop, soil type and nutrient deficiency")
@redis_cache(name="fertilizer_recommend", ttl_seconds=86400)
def recommend(req: FertilizerRequest):
    try:
        result = agro_predictor.recommend_fertilizer(
            crop_type=req.crop_type,
            soil_type=req.soil_type,
            deficiency_level=req.deficiency_level,
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Модель удобрений не найдена. Запустите train/train_agro_models.py ({e})",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
