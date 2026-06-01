"""
train_agro_models.py — Train crop / fertilizer / pesticide recommendation models.

Datasets (place in analytics/data/ or pass --data-dir):
  crop.csv        — N, P, K, temperature, humidity, ph, rainfall → label (crop)
  fertilizer.csv  — crop_type, soil_type, deficiency_level → fertilizer
  pesticide.csv   — crop, pest_type, intensity → pesticide

Saves artefacts to agro-ml-service/models/ (or --models-dir).

Usage:
    cd AgroPlanPro/
    python agro-ml-service/train/train_agro_models.py
    python agro-ml-service/train/train_agro_models.py --data-dir path/to/csvs
"""

import argparse
import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder

# ── Defaults ──────────────────────────────────────────────────────────────────
SERVICE_DIR  = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SERVICE_DIR.parent
DEFAULT_DATA   = PROJECT_ROOT / "analytics" / "data"
DEFAULT_MODELS = SERVICE_DIR / "models"

RF_PARAMS = dict(
    n_estimators=200,
    max_depth=None,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1,
)

CV = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)


def _header(title: str):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def _cv_report(model, X, y, name: str):
    scores = cross_val_score(model, X, y, cv=CV, scoring="f1_macro")
    print(f"  CV F1-macro (5-fold): {scores.mean():.4f} ± {scores.std():.4f}")
    model.fit(X, y)
    is_acc = accuracy_score(y, model.predict(X))
    print(f"  In-sample accuracy:   {is_acc:.4f}  (для справки)")
    return model


# ── 1. Crop recommendation ────────────────────────────────────────────────────

def train_crop(data_dir: Path, models_dir: Path):
    _header("1. Crop Recommendation (crop.csv)")
    csv = data_dir / "crop.csv"
    if not csv.exists():
        print(f"  ⚠️  {csv} not found — skipping")
        return

    df = pd.read_csv(csv)
    print(f"  Loaded: {len(df):,} rows | columns: {list(df.columns)}")

    feature_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    target_col   = "label"

    missing = [c for c in feature_cols + [target_col] if c not in df.columns]
    if missing:
        print(f"  ❌ Missing columns: {missing}"); return

    X  = df[feature_cols].values
    le = LabelEncoder()
    y  = le.fit_transform(df[target_col].astype(str))

    print(f"  Classes ({len(le.classes_)}): {list(le.classes_)}")

    model = RandomForestClassifier(**RF_PARAMS)
    model = _cv_report(model, X, y, "Crop")
    print(classification_report(y, model.predict(X), target_names=le.classes_))

    joblib.dump(model, models_dir / "crop_model.pkl")
    joblib.dump(le,    models_dir / "crop_label_encoder.pkl")
    print(f"  ✅ Saved → {models_dir}/crop_model.pkl")


# ── 2. Fertilizer recommendation ──────────────────────────────────────────────

def train_fertilizer(data_dir: Path, models_dir: Path):
    _header("2. Fertilizer Recommendation (fertilizer.csv)")
    csv = data_dir / "fertilizer.csv"
    if not csv.exists():
        print(f"  ⚠️  {csv} not found — skipping")
        return

    df = pd.read_csv(csv)
    print(f"  Loaded: {len(df):,} rows | columns: {list(df.columns)}")

    # Flexible column name resolution
    col_map = {}
    for src, candidates in [
        ("crop_type",        ["crop_type", "Crop Type", "crop"]),
        ("soil_type",        ["soil_type", "Soil Type", "soil"]),
        ("deficiency_level", ["deficiency_level", "Deficiency Level", "deficiency"]),
        ("fertilizer",       ["fertilizer", "Fertilizer Name", "Fertilizer"]),
    ]:
        for c in candidates:
            if c in df.columns:
                col_map[src] = c
                break
    missing = [k for k in ["crop_type", "soil_type", "deficiency_level", "fertilizer"]
               if k not in col_map]
    if missing:
        print(f"  ❌ Cannot resolve columns: {missing}\n  Available: {list(df.columns)}")
        return

    encoders: dict = {}
    X_parts = []
    for col in ["crop_type", "soil_type", "deficiency_level"]:
        le = LabelEncoder()
        le.fit(df[col_map[col]].astype(str))
        encoders[col] = le
        X_parts.append(le.transform(df[col_map[col]].astype(str)).reshape(-1, 1))

    le_fert = LabelEncoder()
    y = le_fert.fit_transform(df[col_map["fertilizer"]].astype(str))
    encoders["fertilizer"] = le_fert
    X = np.hstack(X_parts)

    print(f"  Fertilizers ({len(le_fert.classes_)}): {list(le_fert.classes_)}")

    model = RandomForestClassifier(**RF_PARAMS)
    model = _cv_report(model, X, y, "Fertilizer")

    joblib.dump(model,    models_dir / "fertilizer_model.pkl")
    joblib.dump(encoders, models_dir / "fertilizer_encoders.pkl")
    print(f"  ✅ Saved → {models_dir}/fertilizer_model.pkl")


# ── 3. Pesticide recommendation ───────────────────────────────────────────────

def train_pesticide(data_dir: Path, models_dir: Path):
    _header("3. Pesticide Recommendation (pesticide.csv)")
    csv = data_dir / "pesticide.csv"
    if not csv.exists():
        print(f"  ⚠️  {csv} not found — skipping")
        return

    df = pd.read_csv(csv)
    print(f"  Loaded: {len(df):,} rows | columns: {list(df.columns)}")

    col_map = {}
    for src, candidates in [
        ("crop",      ["crop", "Crop", "crop_type"]),
        ("pest_type", ["pest_type", "Pest Type", "pest"]),
        ("intensity", ["intensity", "Intensity", "severity"]),
        ("pesticide", ["pesticide", "Pesticide", "Pesticide Name"]),
    ]:
        for c in candidates:
            if c in df.columns:
                col_map[src] = c
                break
    missing = [k for k in ["crop", "pest_type", "intensity", "pesticide"]
               if k not in col_map]
    if missing:
        print(f"  ❌ Cannot resolve columns: {missing}\n  Available: {list(df.columns)}")
        return

    encoders: dict = {}
    X_parts = []
    for col in ["crop", "pest_type", "intensity"]:
        le = LabelEncoder()
        le.fit(df[col_map[col]].astype(str))
        encoders[col] = le
        X_parts.append(le.transform(df[col_map[col]].astype(str)).reshape(-1, 1))

    le_pest = LabelEncoder()
    y = le_pest.fit_transform(df[col_map["pesticide"]].astype(str))
    encoders["pesticide"] = le_pest
    X = np.hstack(X_parts)

    print(f"  Pesticides ({len(le_pest.classes_)}): {list(le_pest.classes_)}")

    model = RandomForestClassifier(**RF_PARAMS)
    model = _cv_report(model, X, y, "Pesticide")

    joblib.dump(model,    models_dir / "pesticide_model.pkl")
    joblib.dump(encoders, models_dir / "pesticide_encoders.pkl")
    print(f"  ✅ Saved → {models_dir}/pesticide_model.pkl")


# ── 4. Disease prediction ────────────────────────────────────────────────

def train_disease(data_dir: Path, models_dir: Path):
    _header("4. Disease Prediction (disease.csv)")
    csv = data_dir / "disease.csv"
    if not csv.exists():
        print(f"  ⚠️  {csv} not found — skipping")
        return

    df = pd.read_csv(csv)
    print(f"  Loaded: {len(df):,} rows | columns: {list(df.columns)}")

    feature_cols = ["crop", "growth_stage"]
    numeric_cols = ["temperature", "humidity", "rainfall"]
    target_disease = "disease"
    target_risk    = "risk_level"

    missing = [c for c in feature_cols + numeric_cols + [target_disease, target_risk]
               if c not in df.columns]
    if missing:
        print(f"  ❌ Missing columns: {missing}"); return

    encoders: dict = {}
    X_parts = []
    for col in feature_cols:
        le = LabelEncoder()
        le.fit(df[col].astype(str))
        encoders[col] = le
        X_parts.append(le.transform(df[col].astype(str)).reshape(-1, 1))

    X_numeric = df[numeric_cols].values
    X = np.hstack(X_parts + [X_numeric])

    # Disease classifier
    le_disease = LabelEncoder()
    y_disease = le_disease.fit_transform(df[target_disease].astype(str))
    encoders["disease"] = le_disease
    print(f"  Diseases ({len(le_disease.classes_)}): {list(le_disease.classes_)}")

    model_disease = RandomForestClassifier(**RF_PARAMS)
    model_disease = _cv_report(model_disease, X, y_disease, "Disease")

    # Risk level classifier
    le_risk = LabelEncoder()
    y_risk = le_risk.fit_transform(df[target_risk].astype(str))
    encoders["risk_level"] = le_risk
    print(f"\n  Risk levels: {list(le_risk.classes_)}")

    model_risk = RandomForestClassifier(**RF_PARAMS)
    model_risk = _cv_report(model_risk, X, y_risk, "Risk")

    joblib.dump(model_disease, models_dir / "disease_model.pkl")
    joblib.dump(model_risk,    models_dir / "disease_risk_model.pkl")
    joblib.dump(encoders,      models_dir / "disease_encoders.pkl")
    print(f"  ✅ Saved → {models_dir}/disease_model.pkl, disease_risk_model.pkl")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Train agro recommendation models")
    parser.add_argument("--data-dir",   default=str(DEFAULT_DATA),   help="Dir with crop/fertilizer/pesticide CSV")
    parser.add_argument("--models-dir", default=str(DEFAULT_MODELS), help="Output dir for .pkl files")
    args = parser.parse_args()

    data_dir   = Path(args.data_dir)
    models_dir = Path(args.models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)

    print(f"Data dir  : {data_dir}")
    print(f"Models dir: {models_dir}")

    train_crop(data_dir, models_dir)
    train_fertilizer(data_dir, models_dir)
    train_pesticide(data_dir, models_dir)
    train_disease(data_dir, models_dir)

    print("\n" + "=" * 60)
    print("  Done. Restart agro-ml-service to reload models.")
    print("=" * 60)


if __name__ == "__main__":
    main()
