import os
from pathlib import Path

SERVICE_DIR   = Path(__file__).resolve().parent.parent  # agro-ml-service/
PROJECT_ROOT  = SERVICE_DIR.parent                      # AgroPlanPro/
ANALYTICS_DIR = PROJECT_ROOT / "analytics"
DATA_DIR      = SERVICE_DIR / "data"                    # agro-ml-service/data/

# Путь к моделям: берём из env-переменной или models/ внутри сервиса
MODELS_DIR: Path = Path(os.getenv("MODELS_DIR", str(SERVICE_DIR / "models")))
ANALYTICS_MODELS_DIR: Path = ANALYTICS_DIR / "master_data" / "models"

def get_models_dir() -> Path:
    """Возвращает директорию с моделями (основную или fallback)."""
    if MODELS_DIR.exists() and any(MODELS_DIR.glob("*.pkl")):
        return MODELS_DIR
    if ANALYTICS_MODELS_DIR.exists() and any(ANALYTICS_MODELS_DIR.glob("*.pkl")):
        return ANALYTICS_MODELS_DIR
    raise FileNotFoundError(
        f"Модели не найдены в {MODELS_DIR} и {ANALYTICS_MODELS_DIR}. "
        "Запустите train/train_agro_models.py"
    )

HOST  = os.getenv("HOST",  "0.0.0.0")
PORT  = int(os.getenv("PORT", "8090"))
TITLE = "AgroPlanPro ML Service"
VERSION = "2.0.0"
DESCRIPTION = (
    "Единый ML-сервис: прогноз урожайности и цен (LightGBM, 76 регионов, 13 культур), "
    "рекомендации культуры / удобрений / пестицидов, NDVI (Sentinel-2 GEE)."
)

GEE_PROJECT = os.getenv("GEE_PROJECT", "ee-agroplan")
