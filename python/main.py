"""
P1-205: FastAPI ML Servisi
- Startup'ta modeller yuklenir
- /predict: anomaly_score + rul_estimate + shap_values (tek yanit)
- /batch-predict: CSV toplu tahmin
- /retrain: modeli guncelle
- /model-metrics: performans metrikleri
- /health: saglik kontrolu
- /shap-values: detayli SHAP aciklamasi
"""

import json
import io
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.isolation_forest import IsolationForestModel
from models.lstm_autoencoder import LSTMAnomalyDetector
from models.rul_predictor import RULPredictor
from explainer import SHAPExplainer
from data_prep import SCADA_SENSOR_COLUMNS, SENSOR_COLUMNS, WINDOW_SIZE

import supabase_client as db

MODELS_DIR = Path(__file__).parent / "models" / "saved"
DATA_DIR = Path(__file__).parent.parent / "data"

# Global model referanslari
if_model: IsolationForestModel | None = None
lstm_model: LSTMAnomalyDetector | None = None
rul_model: RULPredictor | None = None
shap_explainer: SHAPExplainer | None = None
sensor_columns: list[str] = SCADA_SENSOR_COLUMNS


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: modelleri yukle."""
    global if_model, lstm_model, rul_model, shap_explainer, sensor_columns

    print("Modeller yukleniyor...")

    # Scaler'dan sensor sayisi al ve dogru sensor listesini belirle
    import joblib
    scaler_path = MODELS_DIR / "scaler.joblib"
    feature_count = len(sensor_columns)
    if scaler_path.exists():
        scaler = joblib.load(scaler_path)
        feature_count = scaler.n_features_in_
        # Modeller CMAPSS ile egitildiyse CMAPSS sensor isimlerini kullan
        if feature_count != len(SCADA_SENSOR_COLUMNS):
            # CMAPSS: sabit varyans sensorleri filtrelenmis, 14 sensor kalmis
            # data_prep.py'deki filtre mantigi ile ayni siralamayi kullan
            cmapss_all = SENSOR_COLUMNS  # sensor_1 ... sensor_21
            train_path = DATA_DIR / "train_FD001.txt"
            if train_path.exists():
                _df = pd.read_csv(
                    train_path, sep=r"\s+", header=None,
                    names=["unit_id", "cycle"]
                    + [f"op_setting_{i}" for i in range(1, 4)]
                    + cmapss_all,
                )
                _std = _df[cmapss_all].std()
                valid = _std[_std > 0.01].index.tolist()
                if len(valid) == feature_count:
                    sensor_columns = valid
                    print(f"CMAPSS sensor listesi yuklendi ({len(valid)} sensor)")
                else:
                    sensor_columns = cmapss_all[:feature_count]
            else:
                sensor_columns = [f"sensor_{i}" for i in range(1, feature_count + 1)]
            print(f"Sensor listesi: {sensor_columns}")

    # Isolation Forest
    if (MODELS_DIR / "isolation_forest.joblib").exists():
        if_model = IsolationForestModel()
        if_model.load()

    # LSTM Autoencoder
    if (MODELS_DIR / "lstm_autoencoder.pth").exists():
        lstm_model = LSTMAnomalyDetector(input_size=feature_count)
        lstm_model.load()

    # RUL Predictor
    if (MODELS_DIR / "rul_predictor.joblib").exists():
        rul_model = RULPredictor()
        rul_model.load()

    # SHAP Explainer
    if (MODELS_DIR / "isolation_forest.joblib").exists():
        shap_explainer = SHAPExplainer(sensor_columns=sensor_columns)
        shap_explainer.load_model()

    print("Tum modeller yuklendi!")
    yield
    print("Uygulama kapaniyor...")


app = FastAPI(
    title="SCADA Anomali Tespit ML API",
    description="Sensor anomalilerini ML ile tespit et, RUL tahmin et, SHAP ile acikla",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Pydantic modelleri ===

class PredictRequest(BaseModel):
    device_id: str
    sensor_data: dict[str, float]


class PredictResponse(BaseModel):
    is_anomaly: bool
    score: float
    model: str
    rul_estimate: float | None
    confidence: float | None
    shap_values: dict[str, float] | None
    shap_top_feature: str | None


class RetrainRequest(BaseModel):
    dataset_path: str


# === Yardimci fonksiyonlar ===

def sensor_data_to_window(sensor_data: dict[str, float]) -> np.ndarray:
    """Sensor verisini sliding window formatina cevir (son adim olarak)."""
    values = [sensor_data.get(col, 0.0) for col in sensor_columns]
    arr = np.array(values, dtype=np.float32)
    # Tek bir zaman adimini window_size'a genislet (padding)
    window = np.tile(arr, (WINDOW_SIZE, 1))
    return window


# === Endpoint'ler ===

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """Anomali skoru + RUL tahmini + SHAP degerlerini tek seferde doner."""
    window = sensor_data_to_window(request.sensor_data)

    # 1. Isolation Forest anomali tespiti
    is_anomaly = False
    anomaly_score = 0.0
    model_used = "none"

    if if_model:
        if_result = if_model.predict_single(window)
        anomaly_score = if_result["anomaly_score"]
        is_anomaly = if_result["is_anomaly"]
        model_used = "isolation_forest"

    # 2. LSTM Autoencoder (ikinci gorus)
    if lstm_model:
        lstm_result = lstm_model.predict_single(window)
        # Ensemble: iki modelden biri anomali derse anomali
        if lstm_result["is_anomaly"]:
            is_anomaly = True
        # Ortalama skor
        anomaly_score = (anomaly_score + lstm_result["anomaly_score"]) / 2
        model_used = "ensemble"

    # 3. RUL tahmini
    rul_estimate = None
    confidence = None
    if rul_model:
        rul_result = rul_model.predict_single(window)
        rul_estimate = rul_result["rul_estimate"]
        confidence = rul_result["confidence"]

    # 4. SHAP aciklamasi
    shap_values = None
    shap_top_feature = None
    if shap_explainer:
        shap_result = shap_explainer.explain_single(window)
        shap_values = shap_result["shap_values"]
        shap_top_feature = shap_result["shap_top_feature"]

    # 5. Sonuc don (Supabase kaydi ingest_cmapss.py tarafindan Next.js API ile yapilir)
    return PredictResponse(
        is_anomaly=is_anomaly,
        score=round(anomaly_score, 4),
        model=model_used,
        rul_estimate=round(rul_estimate, 1) if rul_estimate else None,
        confidence=round(confidence, 2) if confidence else None,
        shap_values=shap_values,
        shap_top_feature=shap_top_feature,
    )


@app.post("/batch-predict")
async def batch_predict(file: UploadFile = File(...)):
    """CSV yukle, toplu tahmin yap."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV dosyasi gerekli")

    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode("utf-8")))

    results = []
    anomaly_count = 0

    for _, row in df.iterrows():
        sensor_data = {col: float(row[col]) for col in sensor_columns if col in row}
        device_id = str(row.get("device_id", "unknown"))

        window = sensor_data_to_window(sensor_data)

        result = {"device_id": device_id, "is_anomaly": False, "score": 0.0}

        if if_model:
            if_result = if_model.predict_single(window)
            result["is_anomaly"] = if_result["is_anomaly"]
            result["score"] = round(if_result["anomaly_score"], 4)

        if rul_model:
            rul_result = rul_model.predict_single(window)
            result["rul_estimate"] = round(rul_result["rul_estimate"], 1)

        if result["is_anomaly"]:
            anomaly_count += 1

        results.append(result)

    return {"results": results, "anomaly_count": anomaly_count, "total": len(results)}


@app.post("/retrain")
async def retrain(request: RetrainRequest):
    """Yeni veri ile modeli guncelle."""
    global if_model, lstm_model, rul_model, shap_explainer

    from data_prep import prepare_dataset
    from models.isolation_forest import train_isolation_forest
    from models.lstm_autoencoder import train_lstm_autoencoder
    from models.rul_predictor import train_rul_predictor

    dataset = prepare_dataset()

    if_model_new = train_isolation_forest(dataset["X_train"])
    if_model = IsolationForestModel()
    if_model.load()

    lstm_model_new = train_lstm_autoencoder(
        dataset["X_train"], dataset["feature_count"]
    )
    lstm_model = LSTMAnomalyDetector(input_size=dataset["feature_count"])
    lstm_model.load()

    rul_model_new = train_rul_predictor(
        dataset["X_train"], dataset["y_train_rul"]
    )
    rul_model = RULPredictor()
    rul_model.load()

    shap_explainer = SHAPExplainer(sensor_columns=dataset["sensor_columns"])
    shap_explainer.load_model()

    return {"status": "ok", "message": "Tum modeller yeniden egitildi"}


@app.get("/model-metrics")
async def model_metrics():
    """Aktif modelin performans metrikleri."""
    metrics_path = DATA_DIR / "metrics.json"

    if metrics_path.exists():
        with open(metrics_path) as f:
            return json.load(f)

    return {
        "model": "isolation_forest",
        "accuracy": None,
        "f1": None,
        "auc": None,
        "rul_rmse": None,
        "message": "Henuz degerlendirme yapilmadi. python/evaluate.py calistirin.",
    }


@app.get("/health")
async def health():
    """Servis saglik kontrolu."""
    return {
        "status": "healthy",
        "model_loaded": if_model is not None,
        "lstm_model_loaded": lstm_model is not None,
        "rul_model_loaded": rul_model is not None,
        "shap_loaded": shap_explainer is not None,
    }


@app.get("/shap-values")
async def shap_values(anomaly_id: str | None = None):
    """Belirli bir anomali icin detayli SHAP aciklamasi."""
    if not shap_explainer:
        raise HTTPException(status_code=503, detail="SHAP explainer yuklenmedi")

    # Demo: rastgele bir ornek uzerinde aciklama
    demo_window = np.random.rand(WINDOW_SIZE, len(sensor_columns)).astype(np.float32)
    result = shap_explainer.explain_single(demo_window)

    return {
        "anomaly_id": anomaly_id,
        "features": list(result["shap_values"].keys()),
        "shap_values": list(result["shap_values"].values()),
        "top_feature": result["shap_top_feature"],
    }
