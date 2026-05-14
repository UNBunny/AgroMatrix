import joblib
import logging
import numpy as np
import pandas as pd
from functools import lru_cache
from pathlib import Path

from config import get_models_dir

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _load_crop():
    d = get_models_dir()
    model = joblib.load(d / "crop_model.pkl")
    le    = joblib.load(d / "crop_label_encoder.pkl")
    return model, le


@lru_cache(maxsize=1)
def _load_fertilizer():
    d = get_models_dir()
    model = joblib.load(d / "fertilizer_model.pkl")
    encs  = joblib.load(d / "fertilizer_encoders.pkl")
    return model, encs


@lru_cache(maxsize=1)
def _load_pesticide():
    d = get_models_dir()
    model = joblib.load(d / "pesticide_model.pkl")
    encs  = joblib.load(d / "pesticide_encoders.pkl")
    return model, encs


def recommend_crop(
    N: float, P: float, K: float,
    temperature: float, humidity: float,
    ph: float, rainfall: float,
) -> dict:
    """Рекомендация культуры по почвенным и климатическим параметрам (нашей под Западную Сибирь)."""
    model, le = _load_crop()
    X = pd.DataFrame([[N, P, K, temperature, humidity, ph, rainfall]],
                     columns=["N", "P", "K", "temperature", "humidity", "ph", "rainfall"])
    probs = model.predict_proba(X)[0]
    top_idx = np.argsort(probs)[::-1]
    top3 = [{"crop": le.classes_[i], "probability": round(float(probs[i]), 4)}
            for i in top_idx[:3]]
    return {
        "recommended_crop": le.classes_[top_idx[0]],
        "confidence": round(float(probs[top_idx[0]]), 4),
        "top3": top3,
    }


# Маппинг текстур FAO/SoilGrids → три типа почвы (loamy | chernozem | solonetz)
_SOIL_TEXTURE_MAP: dict[str, str] = {
    "chernozem": "chernozem",
    "loam": "loamy",
    "loamy": "loamy",
    "sandy loam": "loamy",
    "silt loam": "loamy",
    "clay loam": "loamy",
    "silty clay loam": "loamy",
    "clay": "loamy",
    "silty clay": "loamy",
    "sandy clay loam": "loamy",
    "sandy clay": "loamy",
    "sand": "loamy",
    "loamy sand": "loamy",
    "silt": "loamy",
    "solonetz": "solonetz",
    "solonchak": "solonetz",
    "solod": "solonetz",
}


def _map_soil_type(raw: str) -> str:
    """Normalise a FAO/SoilGrids texture string to the model's soil-type classes."""
    return _SOIL_TEXTURE_MAP.get(raw.lower().strip(), "loamy")


def recommend_fertilizer(crop_type: str, soil_type: str, deficiency_level: str) -> dict:
    """Рекомендация удобрения по культуре, типу почвы и дефициту элемента."""
    model, encs = _load_fertilizer()
    le_crop  = encs["crop_type"]
    le_soil  = encs["soil_type"]
    le_def   = encs["deficiency_level"]
    le_fert  = encs["fertilizer"]

    soil_type_mapped = _map_soil_type(soil_type)

    def safe_encode(le, val):
        val = str(val)
        if val not in set(le.classes_):
            log.warning("safe_encode: unknown value '%s', falling back to '%s'", val, le.classes_[0])
        return int(le.transform([val if val in set(le.classes_) else le.classes_[0]])[0])

    X = pd.DataFrame([[
        safe_encode(le_crop, crop_type),
        safe_encode(le_soil, soil_type_mapped),
        safe_encode(le_def,  deficiency_level),
    ]], columns=["crop_type", "soil_type", "deficiency_level"])

    probs = model.predict_proba(X)[0]
    best  = int(np.argmax(probs))
    return {
        "recommended_fertilizer": le_fert.classes_[best],
        "confidence": round(float(probs[best]), 4),
        "note": f"For {crop_type} on {soil_type} soil with {deficiency_level} deficiency",
    }


_ACTIVE_INGREDIENTS = {
    "Имидаклоприд":            "имидаклоприд (неоникотиноид)",
    "Ацетамиприд":             "ацетамиприд (неоникотиноид)",
    "Тиаметоксам":             "тиаметоксам (неоникотиноид)",
    "Малатион":                "малатион (фосфорорганический)",
    "Хлорпирифос":             "хлорпирифос (фосфорорганический)",
    "Лямбда-цигалотрин":       "лямбда-цигалотрин (пиретроид)",
    "Циперметрин":             "циперметрин (пиретроид)",
    "Bacillus thuringiensis":  "Bacillus thuringiensis (биопестицид)",
}

def recommend_pesticide(crop: str, pest_type: str, intensity: str) -> dict:
    """Рекомендация пестицида по культуре, виду вредителя и интенсивности поражения."""
    model, encs = _load_pesticide()
    le_crop      = encs["crop"]
    le_pest      = encs["pest_type"]
    le_intensity = encs["intensity"]
    le_pesticide = encs["pesticide"]

    def safe_encode(le, val):
        val = str(val)
        if val not in set(le.classes_):
            log.warning("safe_encode: unknown value '%s', falling back to '%s'", val, le.classes_[0])
        return int(le.transform([val if val in set(le.classes_) else le.classes_[0]])[0])

    X = pd.DataFrame([[
        safe_encode(le_crop,      crop),
        safe_encode(le_pest,      pest_type),
        safe_encode(le_intensity, intensity),
    ]], columns=["crop", "pest_type", "intensity"])

    probs = model.predict_proba(X)[0]
    best  = int(np.argmax(probs))
    name  = le_pesticide.classes_[best]
    return {
        "recommended_pesticide": name,
        "confidence": round(float(probs[best]), 4),
        "active_ingredient": _ACTIVE_INGREDIENTS.get(name),
    }
