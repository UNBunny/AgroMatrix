from fastapi import APIRouter, HTTPException
from schemas.agro_schemas import PesticideRequest, PesticideResponse
from predictors import agro_predictor

router = APIRouter(prefix="/api/pesticide", tags=["Agrochemistry"])


@router.post("/recommend", response_model=PesticideResponse,
             summary="Recommend pesticide by crop, pest type and infestation intensity")
def recommend(req: PesticideRequest):
    try:
        result = agro_predictor.recommend_pesticide(
            crop=req.crop,
            pest_type=req.pest_type,
            intensity=req.intensity,
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Модель пестицидов не найдена. Запустите train/train_agro_models.py ({e})",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
