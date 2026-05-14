from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter
from schemas.protection_schemas import (
    CropProtectionEntryDto,
    NdviSnapshotDto,
    RiskLevel,
    ThreatAnalysisRequest,
    ThreatAnalysisResponse,
    ThreatRecommendation,
    WeatherWindowDto,
)

router = APIRouter(prefix="/api/ml", tags=["Plant Protection Intelligence"])


@router.post(
    "/analyze-threats",
    response_model=ThreatAnalysisResponse,
    summary="Analyze phytosanitary threats and recommend pesticides for a field",
)
def analyze_threats(req: ThreatAnalysisRequest) -> ThreatAnalysisResponse:
    raw_index = _calculate_infection_index(req.weather_data, req.target_diseases)
    corrected_index, nitrogen_warning = _apply_ndvi_correction(
        raw_index, req.ndvi_data, req.bbch_stage
    )
    risk_level = _score_to_risk_level(corrected_index)
    bbch_ok = _filter_by_bbch(req.catalog_entries, req.bbch_stage)
    disease_ok = _filter_by_diseases(bbch_ok, req.target_diseases)
    ambient = req.weather_data.avg_temp_48h or req.weather_data.forecast_temp_24h or 20.0
    temp_ok = _filter_by_temperature(disease_ok, ambient)
    rain_pairs = _check_rain_fastness_all(temp_ok, req.weather_data)
    diverse_pairs = _select_diverse_fracs(rain_pairs)
    recommendations = [
        _build_recommendation(entry, note, req, corrected_index, ambient)
        for entry, note in diverse_pairs
    ]

    active_threats = sorted({e.disease_name for e, _ in diverse_pairs})
    fracs_used = sorted({e.frac_code for e, _ in diverse_pairs if e.frac_code})
    notes = _build_analysis_notes(req, corrected_index, risk_level, len(recommendations))

    return ThreatAnalysisResponse(
        risk_level=risk_level,
        infection_index=round(raw_index, 3),
        ndvi_corrected_index=round(corrected_index, 3),
        nitrogen_overload_warning=nitrogen_warning,
        active_threats=active_threats,
        recommendations=recommendations,
        fracs_used_recently=fracs_used,
        analysis_notes=notes,
    )


# Температурные оптимумы патогенов (t_opt_lo, t_opt_hi, t_viable_lo, t_viable_hi)
_PATHOGEN_TEMP_RANGES: Dict[str, Tuple[float, float, float, float]] = {
    "fusarium":      (25.0, 30.0, 20.0, 35.0),
    "фузариоз":      (25.0, 30.0, 20.0, 35.0),
    "septoria":      (15.0, 20.0, 10.0, 25.0),
    "септориоз":     (15.0, 20.0, 10.0, 25.0),
    "puccinia":      (15.0, 25.0, 10.0, 30.0),
    "ржавчина":      (15.0, 25.0, 10.0, 30.0),
    "alternaria":    (26.0, 32.0, 20.0, 35.0),
    "альтернариоз":  (26.0, 32.0, 20.0, 35.0),
    "sclerotinia":   (15.0, 21.0, 10.0, 26.0),
    "склеротиния":   (15.0, 21.0, 10.0, 26.0),
    "склеротиниоз":  (15.0, 21.0, 10.0, 26.0),
}
_DEFAULT_TEMP_RANGE: Tuple[float, float, float, float] = (15.0, 23.0, 10.0, 27.0)


def _get_pathogen_temp_range(disease_names: List[str]) -> Tuple[float, float, float, float]:
    """Температурный диапазон для патогена по названию болезни."""
    for name in disease_names:
        key = name.lower()
        for fragment, ranges in _PATHOGEN_TEMP_RANGES.items():
            if fragment in key:
                return ranges
    return _DEFAULT_TEMP_RANGE


def _temp_score(temp: float, opt_lo: float, opt_hi: float,
                viable_lo: float, viable_hi: float) -> float:
    """Вклад температуры в индекс заражения."""
    if opt_lo <= temp <= opt_hi:
        return 0.30    # optimal range for this pathogen
    if viable_lo <= temp < opt_lo or opt_hi < temp <= viable_hi:
        return 0.15    # sub-optimal but viable
    if (viable_lo - 5) <= temp < viable_lo or viable_hi < temp <= (viable_hi + 3):
        return 0.05    # marginal
    return 0.0         # outside all viable range


def _calculate_infection_index(
    w: WeatherWindowDto,
    target_diseases: Optional[List[str]] = None,
) -> float:
    """Суммарный индекс инфекционного риска [0, 1]: влажность + температура + осадки + LWD."""
    score = 0.0

    humidity = w.avg_humidity_48h or w.forecast_humidity_24h or 0.0
    temp     = w.avg_temp_48h     or w.forecast_temp_24h     or 0.0
    precip   = (w.total_precip_48h or 0.0) + (w.forecast_precip_24h or 0.0)

    if humidity >= 90:
        score += 0.35
    elif humidity >= 85:
        score += 0.25
    elif humidity >= 75:
        score += 0.10
    elif humidity >= 65:
        score += 0.04

    opt_lo, opt_hi, viable_lo, viable_hi = _get_pathogen_temp_range(target_diseases or [])
    score += _temp_score(temp, opt_lo, opt_hi, viable_lo, viable_hi)

    if precip > 20:
        score += 0.20
    elif precip > 10:
        score += 0.15
    elif precip > 5:
        score += 0.10
    elif precip > 0:
        score += 0.05

    # Продолжительность увлажнения листьев (LWD) — ключевой фактор
    lwd = w.leaf_wetness_duration_hours
    if lwd is None:
        lwd = _estimate_lwd(humidity, precip, temp)

    if lwd >= 12:
        _, _, viable_lo, viable_hi = _get_pathogen_temp_range(target_diseases or [])
        if viable_lo <= temp <= viable_hi:
            score = max(score, 0.87)
        else:
            score += 0.15
    elif lwd >= 8:
        score += 0.20
    elif lwd >= 4:
        score += 0.10
    elif lwd >= 2:
        score += 0.05

    return min(score, 1.0)


def _estimate_lwd(humidity: float, precip: float, temp: float = 20.0) -> float:
    """Эвристическая оценка LWD при отсутствии сенсорных данных."""
    if humidity >= 90 and precip > 5:
        base = 16.0
    elif humidity >= 90:
        base = 12.0
    elif humidity >= 85 and precip > 2:
        base = 12.0
    elif humidity >= 85:
        base = 8.0
    elif humidity >= 80 and precip > 0:
        base = 6.0
    elif humidity >= 75:
        base = 3.0
    else:
        base = max(0.0, (humidity - 65.0) / 5.0) if humidity > 65 else 0.0

    if temp < 5.0:
        base = min(base, 8.0) * 0.5
    elif temp < 10.0:
        base = min(base, 8.0)

    return base


# Нормальные диапазоны NDVI по фазам BBCH: (bbch_min, bbch_max, ndvi_lo, ndvi_hi)
_NDVI_NORMS: List[Tuple[int, int, float, float]] = [
    (10, 29, 0.25, 0.60),   # seedling → tillering
    (30, 49, 0.50, 0.78),   # stem extension → boot
    (50, 69, 0.62, 0.88),   # heading → anthesis
    (70, 89, 0.38, 0.68),   # dough → late ripening
    (90, 99, 0.20, 0.45),   # maturity
]


def _apply_ndvi_correction(
    base_score: float,
    ndvi: NdviSnapshotDto,
    bbch_stage: int,
) -> Tuple[float, Optional[str]]:
    """Корректирует индекс риска по динамике NDVI; возвращает (score, предупреждение об азоте)."""
    corrected = base_score
    nitrogen_warning: Optional[str] = None

    if ndvi.ndvi_delta is not None:
        if ndvi.ndvi_delta < -0.10:
            corrected *= 1.4
        elif ndvi.ndvi_delta < -0.05:
            corrected *= 1.2
        elif ndvi.ndvi_delta < -0.02:
            corrected *= 1.05

    if ndvi.current_ndvi is not None:
        for (bmin, bmax, ndvi_lo, ndvi_hi) in _NDVI_NORMS:
            if bmin <= bbch_stage <= bmax:
                upper_threshold = ndvi_hi + 0.10
                if ndvi.current_ndvi > upper_threshold:
                    nitrogen_warning = (
                        f"NDVI {ndvi.current_ndvi:.3f} аномально высокий для BBCH {bbch_stage} "
                        f"(норма {ndvi_lo:.2f}–{ndvi_hi:.2f}). "
                        f"Признак передозировки азота: повышена восприимчивость "
                        f"к мучнистой росе и риск полегания."
                    )
                break

    return min(corrected, 1.0), nitrogen_warning



def _filter_by_bbch(
    entries: List[CropProtectionEntryDto], bbch_stage: int
) -> List[CropProtectionEntryDto]:
    result = []
    for e in entries:
        if e.application_type == "SEED_TREATMENT" and e.bbch_from == 0 and e.bbch_to == 0:
            if bbch_stage > 0:
                continue
        if e.bbch_from is None or e.bbch_to is None:
            result.append(e)
            continue
        if e.bbch_from <= bbch_stage <= e.bbch_to:
            result.append(e)
    return result



def _filter_by_diseases(
    entries: List[CropProtectionEntryDto],
    target_diseases: List[str],
) -> List[CropProtectionEntryDto]:
    if not target_diseases:
        return entries
    filtered = [e for e in entries if e.disease_name in target_diseases]
    return filtered if filtered else entries



def _filter_by_temperature(
    entries: List[CropProtectionEntryDto], ambient_temp: float
) -> List[CropProtectionEntryDto]:
    suitable = [
        e for e in entries
        if (e.temp_min_c is None or ambient_temp >= e.temp_min_c)
        and (e.temp_max_c is None or ambient_temp <= e.temp_max_c)
    ]
    return suitable if suitable else entries


# Группы FRAC по системности (скорость поглощения)
_SYSTEMIC_FRACS: set = {"G1", "G2", "C3", "11"}      # триазолы, морфолины, стробилурины, SDHI (1–2 ч)
_SEMI_SYSTEMIC_FRACS: set = {"7"}                     # анилинопиримидины (4–6 ч)
_CONTACT_FRACS: set = {"M3", "M4", "M5", "MBC"}       # контактные


def _check_rain_fastness(
    entry: CropProtectionEntryDto,
    w: WeatherWindowDto,
) -> Tuple[bool, str]:
    """Проверяет допустимость применения при ожидаемых осадках."""
    rain_expected = bool(w.rain_expected_in_3h) or (
        (w.forecast_precip_24h or 0) > 3.0
        and (w.forecast_humidity_24h or 0) > 75
    )

    if not rain_expected:
        return True, ""

    frac = (entry.frac_code or "").upper()
    frac_group = (entry.frac_group or "").lower()
    fracs_in_product = {f.strip() for f in frac.split("+")}

    if fracs_in_product & _SYSTEMIC_FRACS:
        hours_to_rain = "< 3 ч" if w.rain_expected_in_3h else "в ближайшие 24 ч"
        return True, (
            f"Системный препарат — устойчив к осадкам, "
            f"ожидаемым через {hours_to_rain}"
        )

    if fracs_in_product & _SEMI_SYSTEMIC_FRACS:
        if w.rain_expected_in_3h:
            return False, "Анилинопиримидин (FRAC 7) — поглощение 4–6 ч, осадки в ближайшие 3 ч снизят эффективность"
        return True, "Анилинопиримидин (FRAC 7) — поглощение 4–6 ч, до ожидаемых осадков достаточно времени"

    if fracs_in_product & _CONTACT_FRACS:
        return False, "Контактный препарат — ожидаемые осадки снизят эффективность"

    # Heuristic fallback based on group description
    if any(kw in frac_group for kw in ("триазол", "стробилурин", "морфолин")):
        return True, "Системный препарат — устойчив к ожидаемым осадкам"
    if any(kw in frac_group for kw in ("дитиокарбамат", "контакт")):
        return False, "Контактный препарат — применение при дожде не рекомендуется"

    return True, ""  # default: allow


def _check_rain_fastness_all(
    entries: List[CropProtectionEntryDto],
    w: WeatherWindowDto,
) -> List[Tuple[CropProtectionEntryDto, str]]:
    pairs = [(e, note) for e in entries for ok, note in [_check_rain_fastness(e, w)] if ok]
    # Fallback: if nothing passes rain-fastness, include all with a warning note
    if not pairs and entries:
        pairs = [
            (e, "Нет дождеустойчивых альтернатив — применение при осадках на усмотрение агронома")
            for e in entries
        ]
    return pairs


def _select_diverse_fracs(
    pairs: List[Tuple[CropProtectionEntryDto, str]],
) -> List[Tuple[CropProtectionEntryDto, str]]:
    """Не более 2 препаратов на один FRAC-код (антирезистентность). Комбо-препараты — приоритет."""
    frac_count: Dict[str, int] = {}
    result: List[Tuple[CropProtectionEntryDto, str]] = []

    sorted_pairs = sorted(
        pairs,
        key=lambda p: (-(len((p[0].frac_code or "").split("+"))), p[0].product_name),
    )

    for entry, note in sorted_pairs:
        primary = (entry.frac_code or "UNKNOWN").split("+")[0].strip()
        if frac_count.get(primary, 0) < 2:
            frac_count[primary] = frac_count.get(primary, 0) + 1
            result.append((entry, note))

    return result



def _build_recommendation(
    entry: CropProtectionEntryDto,
    rain_note: str,
    req: ThreatAnalysisRequest,
    infection_score: float,
    ambient_temp: float,
) -> ThreatRecommendation:
    parts: List[str] = []

    if entry.bbch_from is not None and entry.bbch_to is not None:
        parts.append(
            f"BBCH {entry.bbch_from}–{entry.bbch_to}: "
            f"текущая стадия {req.bbch_stage} в окне применения"
        )

    if rain_note:
        parts.append(rain_note)

    if entry.temp_opt_c is not None and abs(ambient_temp - entry.temp_opt_c) <= 3:
        parts.append(
            f"T {ambient_temp:.1f}°C близка к оптимальной "
            f"({entry.temp_opt_c:.0f}°C) для активности препарата"
        )
    elif entry.temp_min_c is not None and entry.temp_max_c is not None:
        parts.append(
            f"Рабочий диапазон {entry.temp_min_c:.0f}–{entry.temp_max_c:.0f}°C: "
            f"текущая T {ambient_temp:.1f}°C допустима"
        )

    frac = entry.frac_code or ""
    if "+" in frac:
        parts.append(
            f"Комбинация FRAC {frac} ({entry.frac_group}) "
            f"снижает риск резистентности патогена"
        )
    elif frac:
        parts.append(f"FRAC {frac} ({entry.frac_group or '—'})")

    if infection_score >= 0.87:
        parts.append("КРИТИЧЕСКИЙ уровень инфекции — немедленное применение")
    elif infection_score >= 0.60:
        parts.append("Высокий риск — срочное профилактическое применение")
    elif infection_score >= 0.35:
        parts.append("Умеренный риск — профилактика рекомендуется")

    rationale = "; ".join(parts) if parts else "Препарат соответствует условиям применения"

    return ThreatRecommendation(
        product_name=entry.product_name,
        frac_code=entry.frac_code,
        frac_group=entry.frac_group,
        active_ingredients=entry.active_ingredients,
        dose_rate=entry.dose_rate,
        dose_value=entry.dose_value,
        dose_unit=entry.dose_unit,
        bbch_from=entry.bbch_from,
        bbch_to=entry.bbch_to,
        temp_min_c=entry.temp_min_c,
        temp_max_c=entry.temp_max_c,
        phi_days=entry.phi_days,
        rationale=rationale,
        disease_name=entry.disease_name,
    )



def _score_to_risk_level(score: float) -> RiskLevel:
    if score >= 0.85:
        return RiskLevel.CRITICAL
    if score >= 0.60:
        return RiskLevel.HIGH
    if score >= 0.35:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def _build_analysis_notes(
    req: ThreatAnalysisRequest,
    score: float,
    risk_level: RiskLevel,
    rec_count: int,
) -> str:
    w = req.weather_data
    n = req.ndvi_data
    parts: List[str] = []

    parts.append(f"Культура: {req.crop_code} | BBCH: {req.bbch_stage}")

    if w.avg_humidity_48h is not None:
        lwd = _estimate_lwd(w.avg_humidity_48h, w.total_precip_48h or 0.0,
                              w.avg_temp_48h or w.forecast_temp_24h or 20.0)
        parts.append(
            f"Влажность 48 ч: {w.avg_humidity_48h:.0f}% | "
            f"Осадки 48 ч: {w.total_precip_48h or 0:.1f} мм | "
            f"LWD ~{lwd:.0f} ч"
        )

    if w.avg_temp_48h is not None:
        parts.append(f"Ср. T 48 ч: {w.avg_temp_48h:.1f}°C")

    if w.forecast_precip_24h is not None:
        rain_flag = " [!] ДОЖДЬ" if (w.rain_expected_in_3h or w.forecast_precip_24h > 3) else ""
        parts.append(f"Прогноз осадков 24 ч: {w.forecast_precip_24h:.1f} мм{rain_flag}")

    if n.current_ndvi is not None:
        delta_str = (
            f" | Δ={n.ndvi_delta:+.3f}" if n.ndvi_delta is not None else ""
        )
        parts.append(f"NDVI: {n.current_ndvi:.3f}{delta_str}")

    parts.append(
        f"Индекс инфекции: {score:.3f} → {risk_level.value} | "
        f"Рекомендаций: {rec_count}"
    )

    return " | ".join(parts)
