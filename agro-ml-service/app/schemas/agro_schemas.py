from typing import Optional
from pydantic import BaseModel, Field


class CropRecommendRequest(BaseModel):
    N: float = Field(..., ge=0,   le=200, example=45,   description="Nitrogen in soil kg/ha")
    P: float = Field(..., ge=0,   le=200, example=30,   description="Phosphorus kg/ha")
    K: float = Field(..., ge=0,   le=300, example=150,  description="Potassium kg/ha")
    temperature: float = Field(..., example=22.0, description="Mean seasonal temperature °C")
    humidity:    float = Field(..., ge=0, le=100, example=65.0, description="Air humidity %")
    ph:          float = Field(..., ge=3, le=10,  example=6.8,  description="Soil pH")
    rainfall:    float = Field(..., ge=0, example=180.0, description="Seasonal rainfall mm")


class CropRecommendResponse(BaseModel):
    recommended_crop: str
    confidence: float
    top3: list[dict]  # [{"crop": str, "probability": float}]


class FertilizerRequest(BaseModel):
    crop_type:        str = Field(..., example="spring_wheat", description="spring_wheat | winter_wheat | spring_barley | corn | sunflower | soybean | rapeseed | peas | buckwheat | flax | oat | rye")
    soil_type:        str = Field(..., example="loamy",   description="loamy | chernozem | solonetz (или любой FAO-класс текстуры — маппится автоматически)")
    deficiency_level: str = Field(..., example="phosphorus",
                                  description="nitrogen | phosphorus | potassium")


class FertilizerResponse(BaseModel):
    recommended_fertilizer: str
    confidence: float
    note: Optional[str] = None


class PesticideRequest(BaseModel):
    crop:      str = Field(..., example="spring_wheat", description="spring_wheat | winter_wheat | spring_barley | corn | sunflower | soybean | rapeseed | peas | flax | buckwheat | red_lentil | green_lentil | black_lentil")
    pest_type: str = Field(..., example="aphid",
                           description="aphid | sunn_pest | thrips | beetle | cutworm | moth | weevil")
    intensity: str = Field(..., example="medium",
                           description="low | medium | high")


class PesticideResponse(BaseModel):
    recommended_pesticide: str
    confidence: float
    active_ingredient: Optional[str] = None


class DiseasePredictRequest(BaseModel):
    crop: str = Field(..., example="spring_wheat",
                      description="spring_wheat | winter_wheat | spring_barley | corn | sunflower | soybean | rapeseed | peas | buckwheat | flax")
    temperature: float = Field(..., example=20.0, description="Mean temperature °C")
    humidity: float = Field(..., ge=0, le=100, example=78.0, description="Air humidity %")
    rainfall: float = Field(..., ge=0, example=80.0, description="Rainfall mm")
    growth_stage: str = Field(..., example="flowering",
                              description="seedling | vegetative | flowering | ripening")


class DiseaseTop3Item(BaseModel):
    disease: str
    probability: float


class DiseasePredictResponse(BaseModel):
    disease: str
    disease_confidence: float
    risk_level: str
    risk_confidence: float
    top3_diseases: list[DiseaseTop3Item]
