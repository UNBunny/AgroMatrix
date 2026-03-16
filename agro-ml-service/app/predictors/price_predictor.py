import json
import numpy as np
import pandas as pd
import joblib
from functools import lru_cache

from config import get_models_dir

_PRICE_LAG_COLS = [
    "price_lag1", "price_lag12", "price_lag24",
    "price_ma3", "price_ma12",
    "price_mom", "price_yoy",
    "price_vol_3m", "price_vol_12m", "price_cv",
]


def _fetch_price_defaults(region: str, crop: str) -> dict:
    """Дефолтные значения лагов цены из price_master.csv для региона+культуры."""
    try:
        df = _load_price_csv()
        subset = df[(df["region"] == region) & (df["crop"] == crop)]
        if not subset.empty:
            row = subset.sort_values(["year", "month_num"]).iloc[-1]
            defaults = {}
            for col in _PRICE_LAG_COLS:
                v = row.get(col)
                if v is not None and not (isinstance(v, float) and np.isnan(v)):
                    defaults[col] = float(v)
                else:
                    defaults[col] = 0.0
            return defaults
    except FileNotFoundError:
        pass
    return {col: 0.0 for col in _PRICE_LAG_COLS}


@lru_cache(maxsize=1)
def _load_price():
    d = get_models_dir()
    model    = joblib.load(d / "price_model.pkl")
    encoders = joblib.load(d / "price_encoders.pkl")
    with open(d / "price_meta.json", encoding="utf-8") as f:
        meta = json.load(f)
    return model, encoders, meta


def _encode_row(row: dict, encoders: dict, cat_cols: list[str]) -> dict:
    row = row.copy()
    for col in cat_cols:
        le = encoders[col]
        val = str(row.get(col, ""))
        if val not in set(le.classes_):
            val = le.classes_[0]
        row[col] = int(le.transform([val])[0])
    return row


def predict_price(
    region: str,
    crop: str,
    year: int,
    month: int,
    price_history: dict | None = None,
) -> float:
    model, encoders, meta = _load_price()
    feats = meta["features_all"]

    defaults = _fetch_price_defaults(region, crop)
    row = {
        **defaults,
        "region":    region,
        "crop":      crop,
        "year":      year,
        "month_num": month,
    }
    if price_history:
        row.update(price_history)

    row = _encode_row(row, encoders, meta["features_cat"])
    X = pd.DataFrame([{f: row.get(f, 0) for f in feats}])
    return float(model.predict(X)[0])


@lru_cache(maxsize=1)
def _load_price_csv() -> "pd.DataFrame":
    from config import ANALYTICS_DIR, DATA_DIR
    candidates = [
        DATA_DIR / "price_master.csv",
        get_models_dir().parent / "price_master.csv",
        ANALYTICS_DIR / "master_data" / "price_master.csv",
        ANALYTICS_DIR / "data_csv" / "price_master.csv",
    ]
    for csv_path in candidates:
        if csv_path.exists():
            return pd.read_csv(csv_path)
    raise FileNotFoundError(f"price_master.csv not found in any of: {candidates}")


def get_price_history(region: str, crop: str) -> dict:
    """Последние лаги цены из price_master.csv для региона+культуры."""
    df = _load_price_csv()
    subset = df[(df["region"] == region) & (df["crop"] == crop)]
    if subset.empty:
        return {
            "region": region, "crop": crop,
            "last_year": 0, "last_month": 0,
            "price_lag1": None, "price_lag12": None, "price_lag24": None,
            "price_ma3": None, "price_ma12": None,
            "price_mom": None, "price_yoy": None,
            "found": False,
        }
    row = subset.sort_values(["year", "month_num"]).iloc[-1]

    def _val(col: str):
        v = row.get(col)
        return None if (v is None or (isinstance(v, float) and np.isnan(v))) else float(v)

    return {
        "region": region,
        "crop": crop,
        "last_year":  int(row["year"]),
        "last_month": int(row["month_num"]),
        "price_lag1":  _val("price_lag1"),
        "price_lag12": _val("price_lag12"),
        "price_lag24": _val("price_lag24"),
        "price_ma3":   _val("price_ma3"),
        "price_ma12":  _val("price_ma12"),
        "price_mom":   _val("price_mom"),
        "price_yoy":   _val("price_yoy"),
        "found": True,
    }


def get_regions() -> list[str]:
    df = _load_price_csv()
    return sorted(df["region"].unique().tolist())


def get_crops() -> list[str]:
    df = _load_price_csv()
    return sorted(df["crop"].unique().tolist())


def get_model_info() -> dict:
    _, _, meta = _load_price()
    return {
        "cv_r2_mean":    meta.get("cv_r2_mean"),
        "cv_rmse_mean":  meta.get("cv_rmse_mean"),
        "cv_mape_mean":  meta.get("cv_mape_mean"),
        "crops":         meta.get("crops", []),
        "trained_at":    meta.get("trained_at"),
        "top5_features": meta.get("top5_features", []),
    }


def get_price_timeseries(region: str, crop: str) -> dict:
    """Полный таймсериь цен из price_master.csv для региона+культуры, по годам и месяцам."""
    df = _load_price_csv()
    subset = df[(df["region"] == region) & (df["crop"] == crop)].copy()
    if subset.empty:
        return {
            "region": region,
            "crop": crop,
            "data": [],
            "years": [],
            "found": False,
        }

    subset = subset.sort_values(["year", "month_num"])

    data_points = []
    for _, row in subset.iterrows():
        price_val = row.get("price_rub_per_ton")
        price_ma3_val = row.get("price_ma3")
        price_ma12_val = row.get("price_ma12")

        data_points.append({
            "year": int(row["year"]),
            "month": int(row["month_num"]),
            "month_name": str(row["month"]),
            "price": float(price_val) if price_val is not None and not (isinstance(price_val, float) and np.isnan(price_val)) else None,
            "price_ma3": float(price_ma3_val) if price_ma3_val is not None and not (isinstance(price_ma3_val, float) and np.isnan(price_ma3_val)) else None,
            "price_ma12": float(price_ma12_val) if price_ma12_val is not None and not (isinstance(price_ma12_val, float) and np.isnan(price_ma12_val)) else None,
        })

    years = sorted(subset["year"].unique().tolist())

    return {
        "region": region,
        "crop": crop,
        "data": data_points,
        "years": years,
        "found": True,
    }
