import json
import logging
import threading
import numpy as np
import pandas as pd
import joblib
from datetime import date as _date
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

from config import get_models_dir, ANALYTICS_DIR, DATA_DIR

_YIELD_NUMERIC_COLS = [
    "yield_lag1", "yield_lag2", "yield_ma3", "yield_ma5",
    "yield_yoy", "yield_volatility", "yield_cv",
    "precip_oct_mar", "precip_apr_may", "precip_jun_jul", "precip_aug_sep",
    "temp_sum_apr_may", "temp_sum_jun_jul", "temp_sum_aug_sep", "temp_sum_apr_sep",
    "precip_oct_mar_zscore", "precip_apr_may_zscore",
    "precip_jun_jul_zscore", "precip_aug_sep_zscore",
    "temp_sum_apr_may_zscore", "temp_sum_jun_jul_zscore", "temp_sum_aug_sep_zscore",
    "drought_index", "weather_favorability",
    "soil_ph_mean", "soil_soc_mean", "soil_nitrogen_mean",
    "soil_clay_mean", "soil_sand_mean", "soil_bdod_mean",
    # soil_type_code: label-encoded LabelEncoder (тот же энкодер при обучении и инференсе)
    "soil_type_code",
    # Посевные площади
    "sown_area_thou_ha", "area_yoy",
]

# Сезонные периоды для уточнения прогноза по мере поступления данных
# close_month — месяц, после которого все данные периода известны
_WEATHER_PERIODS: list[dict] = [
    {
        "id": "oct_mar", "label": "Окт–Мар", "close_month": 4,
        "core": ["precip_oct_mar"],
        "all":  ["precip_oct_mar", "precip_oct_mar_zscore"],
    },
    {
        "id": "apr_may", "label": "Апр–Май", "close_month": 6,
        "core": ["precip_apr_may", "temp_sum_apr_may"],
        "all":  ["precip_apr_may", "temp_sum_apr_may",
                 "precip_apr_may_zscore", "temp_sum_apr_may_zscore"],
    },
    {
        "id": "jun_jul", "label": "Июн–Июл", "close_month": 8,
        "core": ["precip_jun_jul", "temp_sum_jun_jul"],
        "all":  ["precip_jun_jul", "temp_sum_jun_jul",
                 "precip_jun_jul_zscore", "temp_sum_jun_jul_zscore"],
    },
    {
        "id": "aug_sep", "label": "Авг–Сен", "close_month": 10,
        "core": ["precip_aug_sep", "temp_sum_aug_sep"],
        "all":  ["precip_aug_sep", "temp_sum_aug_sep",
                 "precip_aug_sep_zscore", "temp_sum_aug_sep_zscore",
                 "temp_sum_apr_sep", "drought_index", "weather_favorability"],
    },
]

_CLIMATE_COLS: list[str] = [f for p in _WEATHER_PERIODS for f in p["all"]]


def _get_climate_normals(region_code: str, crop: str, n_years: int = 10) -> dict:
    """Средние климатические нормы из harvest_master.csv (за n_years лет)."""
    try:
        df = _load_harvest_csv()
        subset = df[(df["region_code"] == region_code) & (df["crop"] == crop)]
        if len(subset) < 3:
            subset = df[df["crop"] == crop]
        if subset.empty:
            return {}
        recent = subset.nlargest(n_years, "year")
        result: dict = {}
        for col in _CLIMATE_COLS:
            if col in recent.columns:
                vals = recent[col].dropna().values
                if len(vals) > 0:
                    result[col] = float(np.mean(vals))
        return result
    except FileNotFoundError:
        return {}


def predict_yield_progressive(
    region_code: str,
    crop: str,
    year: int,
    as_of_date: str | None = None,
    weather: dict | None = None,
    history: dict | None = None,
) -> dict:
    """
    Прогноз урожайности с уточнением по сезонным периодам.
    Закрытые периоды с реальными данными → "observed", остальные → климатические нормы.
    """
    try:
        aod = _date.fromisoformat(as_of_date) if as_of_date else _date.today()
    except (ValueError, TypeError):
        aod = _date.today()

    normals = _get_climate_normals(region_code, crop)
    provided = weather or {}

    resolved: dict = {}
    periods_observed: list[str] = []
    periods_estimated: list[str] = []
    total_core = 0
    observed_core = 0

    for period in _WEATHER_PERIODS:
        period_closed = (
            aod.year > year
            or (aod.year == year and aod.month >= period["close_month"])
        )
        all_core_provided = all(f in provided for f in period["core"])
        total_core += len(period["core"])

        if all_core_provided:
            # Core data provided (observed or ERA5 field-specific norm) → always use it
            for f in period["all"]:
                if f in provided:
                    resolved[f] = provided[f]
                elif f in normals:
                    resolved[f] = normals[f]
            observed_core += len(period["core"])
            if period_closed:
                periods_observed.append(period["label"])
            else:
                periods_estimated.append(period["label"])
        else:
            # No data provided → fall back to regional climate normals from CSV
            for f in period["all"]:
                if f in normals:
                    resolved[f] = normals[f]
            periods_estimated.append(period["label"])

    completeness_pct = round(observed_core / total_core * 100) if total_core > 0 else 0

    val = predict_yield(
        region_code=region_code,
        crop=crop,
        year=year,
        weather=resolved or None,
        history=history,
    )

    return {
        "value": val,
        "weather_completeness_pct": completeness_pct,
        "periods_observed": periods_observed,
        "periods_estimated": periods_estimated,
        "as_of_date": aod.isoformat(),
    }


@lru_cache(maxsize=1)
def _load_harvest_csv() -> "pd.DataFrame":
    candidates = [
        DATA_DIR / "harvest_master.csv",
        get_models_dir().parent / "harvest_master.csv",
        ANALYTICS_DIR / "master_data" / "harvest_master.csv",
    ]
    for csv_path in candidates:
        if csv_path.exists():
            return pd.read_csv(csv_path)
    raise FileNotFoundError(f"harvest_master.csv not found in any of: {candidates}")


def _fetch_yield_defaults(region_code: str, crop: str) -> dict:
    """Дефолтные значения признаков из последней строки harvest_master.csv для региона+культуры."""
    try:
        df = _load_harvest_csv()
        subset = df[(df["region_code"] == region_code) & (df["crop"] == crop)]
        if not subset.empty:
            sorted_subset = subset.sort_values("year")
            row = sorted_subset.iloc[-1]
            defaults = {}
            for col in _YIELD_NUMERIC_COLS:
                v = row.get(col)
                if v is not None and not (isinstance(v, float) and np.isnan(v)):
                    defaults[col] = float(v)
                else:
                    defaults[col] = 0.0
            # Override stale lag columns with actual recent yields from CSV
            actual_yields = sorted_subset["yield_centners_per_ha"].dropna().values
            if len(actual_yields) >= 1:
                defaults["yield_lag1"] = float(actual_yields[-1])
            if len(actual_yields) >= 2:
                defaults["yield_lag2"] = float(actual_yields[-2])
            if len(actual_yields) >= 3:
                defaults["yield_ma3"] = float(np.mean(actual_yields[-3:]))
            if len(actual_yields) >= 5:
                defaults["yield_ma5"] = float(np.mean(actual_yields[-5:]))
            return defaults
        crop_rows = df[df["crop"] == crop]
        if not crop_rows.empty:
            last_rows = crop_rows.sort_values("year").groupby("region_code").tail(1)
            defaults = {}
            for col in _YIELD_NUMERIC_COLS:
                vals = last_rows[col].dropna().values
                defaults[col] = float(np.mean(vals)) if len(vals) > 0 else 0.0
            return defaults
    except FileNotFoundError:
        pass
    return {col: 0.0 for col in _YIELD_NUMERIC_COLS}


@lru_cache(maxsize=1)
def _load_yield():
    d = get_models_dir()
    model    = joblib.load(d / "yield_model.pkl")
    encoders = joblib.load(d / "yield_encoders.pkl")
    with open(d / "yield_meta.json", encoding="utf-8") as f:
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


def _get_last_known_year(region_code: str, crop: str) -> int | None:
    """Возвращает последний год с реальными данными для региона+культуры из CSV."""
    try:
        df = _load_harvest_csv()
        subset = df[(df["region_code"] == region_code) & (df["crop"] == crop)]
        if not subset.empty:
            return int(subset["year"].max())
    except Exception:
        pass
    return None


def predict_yield(
    region_code: str,
    crop: str,
    year: int,
    weather: dict | None = None,
    history: dict | None = None,
) -> float:
    """Прогноз урожайности (ц/га) для одного региона, культуры и года."""
    model, encoders, meta = _load_yield()
    feats = meta["features_all"]

    defaults = _fetch_yield_defaults(region_code, crop)
    row = {**defaults, "region_code": region_code, "crop": crop, "year": year}
    if weather:
        row.update(weather)
    if history:
        row.update(history)

    # Mean-reversion dampening when predicting beyond last known data year.
    # Prevents anomalous base years (e.g. record 2024 harvest) from being
    # extrapolated directly. Applied only when history does not supply lag1/yoy.
    _last_known_year = _get_last_known_year(region_code, crop)
    if _last_known_year is not None and year > _last_known_year:
        _steps = year - _last_known_year
        _DAMPEN = 0.55
        _YOY_CLIP = 0.10
        _ma5 = defaults.get("yield_ma5", 0.0)
        _anchor = _ma5 if _ma5 > 0 else defaults.get("yield_lag1", 0.0)
        _dampen_w = min(_DAMPEN * _steps, 0.95)
        if "yield_lag1" not in (history or {}):
            row["yield_lag1"] = row["yield_lag1"] * (1.0 - _dampen_w) + _anchor * _dampen_w
        if "yield_yoy" not in (history or {}):
            _lag2 = row.get("yield_lag2", 0.0)
            _raw_yoy = (row["yield_lag1"] - _lag2) / (_lag2 + 1e-8) if _lag2 else 0.0
            row["yield_yoy"] = float(np.clip(_raw_yoy, -_YOY_CLIP, _YOY_CLIP))

    if "area_yoy" in row:
        row["area_yoy"] = float(np.clip(row["area_yoy"], -1.0, 2.0))
    row = _encode_row(row, encoders, meta["features_cat"])
    X = pd.DataFrame([{f: row.get(f, 0) for f in feats}])
    return float(np.expm1(model.predict(X)[0]))


def predict_yield_chained(
    region_code: str,
    crop: str,
    years: list[int],
    known_yields: dict[int, float] | None = None,
    weather: dict | None = None,
) -> dict[int, float]:
    """Цепной многолетний прогноз: каждый год использует предыдущее предсказание как yield_lag1.

    Mean-reversion dampening: на каждом шаге прогноза lag1 плавно смещается к исторической MA5,
    чтобы аномальный базовый год (например, рекордный урожай) не вызывал экспоненциальный взрыв.
    yield_yoy зажат в диапазоне [-0.15, 0.15] — p90 реального межгодового диапазона по регионам.
    """
    _DAMPEN_PER_STEP = 0.55   # 55% mean-reversion к MA5 за каждый шаг вперёд
    _YOY_CLIP = 0.10           # максимальный |yoy| при цепном прогнозе

    hist = dict(known_yields) if known_yields else {}
    predictions: dict[int, float] = {}

    defaults = _fetch_yield_defaults(region_code, crop)
    base_ma5 = defaults.get("yield_ma5", 0.0)

    # Минимальный известный год = начало цепочки (шаг 0 = последний известный факт)
    first_forecast_yr = min(sorted(years))

    for step_idx, yr in enumerate(sorted(years)):
        lag1_raw = hist.get(yr - 1, defaults.get("yield_lag1", 0.0))
        lag2 = hist.get(yr - 2, defaults.get("yield_lag2", 0.0))

        # MA только по прошлым значениям (t-2, t-3, ...) — без утечки данных
        vals_ma3 = [hist.get(yr - i) for i in range(2, 5)]
        vals_ma3 = [v for v in vals_ma3 if v is not None]
        ma3 = float(np.mean(vals_ma3)) if len(vals_ma3) >= 2 else defaults.get("yield_ma3", 0.0)

        vals_ma5 = [hist.get(yr - i) for i in range(2, 7)]
        vals_ma5 = [v for v in vals_ma5 if v is not None]
        ma5 = float(np.mean(vals_ma5)) if len(vals_ma5) >= 2 else base_ma5

        # Степень сдвига к норме зависит от того, насколько далеко мы от известных данных.
        # Шаг 1 (год=first_forecast_yr): dampen=35%; шаг 2: 70% (но не более 95%)
        step_num = step_idx + 1
        dampen_weight = min(_DAMPEN_PER_STEP * step_num, 0.95)
        anchor = ma5 if ma5 > 0 else base_ma5
        lag1 = lag1_raw * (1.0 - dampen_weight) + anchor * dampen_weight

        yoy = float(np.clip(
            (lag1 - lag2) / (lag2 + 1e-8) if lag2 else 0.0,
            -_YOY_CLIP, _YOY_CLIP,
        ))

        history_row = {
            "yield_lag1":     lag1,
            "yield_lag2":     lag2,
            "yield_ma3":      ma3,
            "yield_ma5":      ma5,
            "yield_yoy":      yoy,
        }

        pred = predict_yield(region_code, crop, yr, weather=weather, history=history_row)
        predictions[yr] = round(pred, 2)
        hist[yr] = pred

    return predictions


_regions_cache: dict = {}  # cache_key → (result, timestamp)
_regions_cache_lock = threading.Lock()
_CACHE_TTL_SECONDS = 3600          # 1 hour for current/past years
_CACHE_TTL_FORECAST_SECONDS = 86400  # 24 hours for future forecast years


def predict_regions(
    crop: str,
    year: int,
    weather: dict | None = None,
    as_of_date: str | None = None,
    per_region_weather: dict[str, dict] | None = None,
) -> list[dict]:
    """Прогноз урожайности + цены + сигнала для всех регионов по культуре и году.
    weather — общий dict с сезонными данными (fallback если нет per_region_weather).
    per_region_weather — dict {region_code: {precip_oct_mar, …}} с погодой для каждого региона.
    as_of_date — дата "на сегодня" для определения закрытых периодов (по умолч. сегодня).
    Кэш не используется если передан weather или per_region_weather.
    """
    import time
    import json

    # Cache key includes a hash of per_region_weather so same input hits cache
    weather_hash = None
    if per_region_weather is not None:
        try:
            weather_hash = hash(json.dumps(per_region_weather, sort_keys=True, default=str))
        except Exception:
            weather_hash = None
    cache_key = (crop, year, weather_hash)

    current_year = _date.today().year
    ttl = _CACHE_TTL_FORECAST_SECONDS if year > current_year else _CACHE_TTL_SECONDS

    now = time.time()
    if weather is None:
        with _regions_cache_lock:
            if cache_key in _regions_cache:
                result, ts = _regions_cache[cache_key]
                if now - ts < ttl:
                    return result

    _, _, meta = _load_yield()
    df = _load_harvest_csv()

    region_map: dict[str, str] = {}
    for _, row in df[["region_code", "region"]].drop_duplicates().iterrows():
        region_map[str(row["region_code"])] = str(row["region"])

    crop_rows = df[df["crop"] == crop]
    valid_regions = sorted(crop_rows["region_code"].unique().tolist())

    _predict_price = None
    _get_price_history = None
    try:
        from predictors.price_predictor import predict_price as _predict_price, get_price_history as _get_price_history
    except Exception:
        try:
            from price_predictor import predict_price as _predict_price, get_price_history as _get_price_history
        except Exception:
            pass
    _has_price = _predict_price is not None

    # Маппинг культур: yield → price (в price_master некоторые культуры объединены)
    _YIELD_TO_PRICE_CODE: dict[str, str] = {
        "spring_wheat":   "wheat",
        "winter_wheat":   "wheat",
        "spring_barley":  "barley",
        "winter_barley":  "barley",
        "corn":           "corn",
        "sunflower":      "sunflower",
        "rapeseed":       "rapeseed",
        "spring_rapeseed":"rapeseed",
        "winter_rapeseed":"rapeseed",
        "peas":           "peas",
        "buckwheat":      "buckwheat",
        "oat":            "oat",
        "rye":            "rye",
        "winter_rye":     "rye",
        "millet":         "millet",
        "flax":           "flax",
        "soybean":        "soybean",
    }

    # Месяц уборки для прогноза цены
    _HARVEST_MONTHS = {
        "winter_wheat": 8, "winter_rye": 8, "winter_barley": 8,
        "winter_rapeseed": 7, "spring_wheat": 9, "spring_barley": 9,
        "spring_rye": 9, "oat": 9, "buckwheat": 9,
        "sunflower": 10, "rapeseed": 8, "spring_rapeseed": 8, "flax": 8,
    }
    harvest_month = _HARVEST_MONTHS.get(crop, 9)

    results = []
    for region_code in valid_regions:
        region_name = region_map.get(region_code, region_code)

        try:
            subset_sorted = crop_rows[crop_rows["region_code"] == region_code].sort_values("year")
            last_known_year = int(subset_sorted["year"].max()) if not subset_sorted.empty else year - 1

            # Return actual data if available for this year
            actual_row = subset_sorted[subset_sorted["year"] == year]
            if not actual_row.empty:
                actual_val = actual_row.iloc[-1].get("yield_centners_per_ha")
                if actual_val is not None and not (isinstance(actual_val, float) and np.isnan(actual_val)):
                    yld = round(float(actual_val), 2)
                    is_forecast = False
                else:
                    yld = round(predict_yield(region_code=region_code, crop=crop, year=year), 2)
                    is_forecast = True
            elif year > last_known_year + 1:
                # Chain prediction for years far into the future
                chain_years = list(range(last_known_year + 1, year + 1))
                known_yields: dict[int, float] = {}
                if not subset_sorted.empty:
                    last_row = subset_sorted.iloc[-1]
                    actual_last = last_row.get("yield_centners_per_ha")
                    if actual_last is not None and not (isinstance(actual_last, float) and np.isnan(actual_last)):
                        known_yields[last_known_year] = float(actual_last)
                region_weather = (
                    per_region_weather.get(region_code) if per_region_weather else None
                ) or weather
                chained = predict_yield_chained(
                    region_code=region_code, crop=crop, years=chain_years,
                    known_yields=known_yields, weather=region_weather,
                )
                yld = round(chained[year], 2)
                is_forecast = True
            else:
                region_weather = (
                    per_region_weather.get(region_code) if per_region_weather else None
                ) or weather
                prog = predict_yield_progressive(
                    region_code=region_code, crop=crop, year=year,
                    weather=region_weather, as_of_date=as_of_date,
                )
                yld = round(prog["value"], 2)
                is_forecast = True
        except Exception:
            continue

        subset = crop_rows[crop_rows["region_code"] == region_code].sort_values("year")
        ma5_val: float | None = None
        sown_area: float | None = None
        if not subset.empty:
            last_row = subset.iloc[-1]
            v = last_row.get("yield_ma5")
            if v is not None and not (isinstance(v, float) and np.isnan(v)):
                ma5_val = float(v)
            v2 = last_row.get("sown_area_thou_ha")
            if v2 is not None and not (isinstance(v2, float) and np.isnan(v2)):
                sown_area = float(v2)

        delta_pct: float | None = None
        if ma5_val and ma5_val > 0:
            delta_pct = round((yld - ma5_val) / ma5_val * 100, 1)

        if delta_pct is None:
            signal = "UNKNOWN"
        elif delta_pct > 15:
            signal = "SURPLUS"
        elif delta_pct < -15:
            signal = "DEFICIT"
        else:
            signal = "NEUTRAL"

        price_pred: float | None = None
        if _has_price:
            price_crop = _YIELD_TO_PRICE_CODE.get(crop)
            if price_crop is not None:
                try:
                    price_hist: dict | None = None
                    if _get_price_history is not None:
                        ph = _get_price_history(region=region_name, crop=price_crop)
                        if ph.get("found"):
                            price_hist = {k: ph[k] for k in (
                                "price_lag1", "price_lag12", "price_lag24",
                                "price_ma3", "price_ma12", "price_mom", "price_yoy",
                            ) if ph.get(k) is not None}
                    if price_hist:
                        price_pred = round(_predict_price(
                            region=region_name, crop=price_crop,
                            year=year, month=harvest_month,
                            price_history=price_hist,
                        ), 2)
                except Exception:
                    price_pred = None

        results.append({
            "region_code": region_code,
            "region_name": region_name,
            "yield_pred": yld,
            "yield_ma5": ma5_val,
            "delta_pct": delta_pct,
            "price_pred": price_pred,
            "signal": signal,
            "sown_area_thou_ha": sown_area,
            "is_forecast": is_forecast,
        })

    if weather is None:
        with _regions_cache_lock:
            _regions_cache[cache_key] = (results, now)
    return results


def get_model_info() -> dict:
    """Return model metadata from yield_meta.json."""
    _, _, meta = _load_yield()
    return {
        "cv_r2_mean":    meta.get("cv_r2_mean"),
        "cv_rmse_mean":  meta.get("cv_rmse_mean"),
        "cv_mape_mean":  meta.get("cv_mape_mean"),
        "in_sample_r2":  meta.get("in_sample_r2"),
        "cv_type":       meta.get("cv_type"),
        "crops":         meta.get("crops", []),
        "n_regions":     meta.get("n_regions"),
        "years":         meta.get("years"),
        "trained_at":    meta.get("trained_at"),
        "top5_features": meta.get("top5_features", []),
    }
