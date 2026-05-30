from fastapi import APIRouter, HTTPException
from schemas.agro_schemas import DiseasePredictRequest, DiseasePredictResponse
from predictors import disease_predictor
from cache import redis_cache

router = APIRouter(prefix="/api/disease", tags=["Disease Prediction"])


@router.post("/predict", response_model=DiseasePredictResponse,
             summary="Predict crop disease and risk level based on weather and growth stage")
@redis_cache(name="disease_predict", ttl_seconds=21600)  # 6 ч — погодные данные обновляются
def predict(req: DiseasePredictRequest):
    try:
        result = disease_predictor.predict_disease(
            crop=req.crop,
            temperature=req.temperature,
            humidity=req.humidity,
            rainfall=req.rainfall,
            growth_stage=req.growth_stage,
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Модель болезней не найдена. Запустите train/train_agro_models.py ({e})",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
