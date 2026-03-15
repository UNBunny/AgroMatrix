import joblib
import logging
import numpy as np
import pandas as pd
from functools import lru_cache
from pathlib import Path

from config import get_models_dir

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _load_disease():
    d = get_models_dir()
    model_disease = joblib.load(d / "disease_model.pkl")
    model_risk    = joblib.load(d / "disease_risk_model.pkl")
    encoders      = joblib.load(d / "disease_encoders.pkl")
    return model_disease, model_risk, encoders


def predict_disease(
    crop: str,
    temperature: float,
    humidity: float,
    rainfall: float,
    growth_stage: str,
) -> dict:
    """Прогноз наиболее вероятного заболевания и уровня риска по условиям выращивания."""
    model_disease, model_risk, encoders = _load_disease()
    le_crop  = encoders["crop"]
    le_stage = encoders["growth_stage"]
    le_disease = encoders["disease"]
    le_risk    = encoders["risk_level"]

    def safe_encode(le, val):
        val = str(val)
        if val not in set(le.classes_):
            log.warning("safe_encode: unknown value '%s', falling back to '%s'", val, le.classes_[0])
        return int(le.transform([val if val in set(le.classes_) else le.classes_[0]])[0])

    crop_enc  = safe_encode(le_crop, crop)
    stage_enc = safe_encode(le_stage, growth_stage)

    X = np.array([[crop_enc, stage_enc, temperature, humidity, rainfall]])

    disease_probs = model_disease.predict_proba(X)[0]
    top_idx = np.argsort(disease_probs)[::-1]
    top3 = [
        {"disease": le_disease.classes_[i], "probability": round(float(disease_probs[i]), 4)}
        for i in top_idx[:3]
    ]
    best_disease = le_disease.classes_[top_idx[0]]
    disease_confidence = round(float(disease_probs[top_idx[0]]), 4)

    risk_probs = model_risk.predict_proba(X)[0]
    best_risk_idx = int(np.argmax(risk_probs))
    best_risk = le_risk.classes_[best_risk_idx]
    risk_confidence = round(float(risk_probs[best_risk_idx]), 4)

    return {
        "disease": best_disease,
        "disease_confidence": disease_confidence,
        "risk_level": best_risk,
        "risk_confidence": risk_confidence,
        "top3_diseases": top3,
    }
