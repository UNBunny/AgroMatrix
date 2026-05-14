from fastapi import APIRouter, HTTPException
from schemas.agro_schemas import CropRecommendRequest, CropRecommendResponse
from predictors import agro_predictor

router = APIRouter(prefix="/api/crop", tags=["Agrochemistry"])


@router.post("/recommend", response_model=CropRecommendResponse,
             summary="Recommend crop by soil chemistry and climate")
def recommend(req: CropRecommendRequest):
    try:
        result = agro_predictor.recommend_crop(
            N=req.N, P=req.P, K=req.K,
            temperature=req.temperature,
            humidity=req.humidity,
            ph=req.ph,
            rainfall=req.rainfall,
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Модель культуры не найдена. Запустите train/train_agro_models.py ({e})",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
