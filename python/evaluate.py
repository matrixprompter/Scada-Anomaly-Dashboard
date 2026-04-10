"""
P1-204: Model Karsilastirma ve Degerlendirme
- Isolation Forest ve LSTM Autoencoder'i test setinde degerlendir
- classification_report, confusion_matrix, ROC-AUC
- RUL modeli icin RMSE
- Tum sonuclari metrics.json olarak kaydet
"""

import json
import numpy as np
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    f1_score,
    precision_score,
    recall_score,
    accuracy_score,
    mean_squared_error,
)
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent))

from data_prep import prepare_dataset
from models.isolation_forest import IsolationForestModel
from models.lstm_autoencoder import LSTMAnomalyDetector
from models.rul_predictor import RULPredictor

MODELS_DIR = Path(__file__).parent / "models" / "saved"
OUTPUT_DIR = Path(__file__).parent.parent / "data"


def evaluate_isolation_forest(X_test: np.ndarray, y_test: np.ndarray) -> dict:
    """Isolation Forest degerlendirme."""
    print("\n=== Isolation Forest Degerlendirme ===")
    model = IsolationForestModel()
    model.load()

    result = model.predict(X_test)
    y_pred = result["is_anomaly"].astype(int)
    scores = result["anomaly_scores"]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, scores) if len(np.unique(y_test)) > 1 else 0.0

    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(f"AUC-ROC:   {auc:.4f}")

    cm = confusion_matrix(y_test, y_pred).tolist()
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    return {
        "model_name": "isolation_forest",
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "auc_roc": round(auc, 4),
        "confusion_matrix": cm,
        "classification_report": report,
        "anomaly_scores": scores.tolist(),
    }


def evaluate_lstm(X_test: np.ndarray, y_test: np.ndarray, input_size: int) -> dict:
    """LSTM Autoencoder degerlendirme."""
    print("\n=== LSTM Autoencoder Degerlendirme ===")
    detector = LSTMAnomalyDetector(input_size=input_size)
    detector.load()

    result = detector.predict(X_test)
    y_pred = result["is_anomaly"].astype(int)
    scores = result["anomaly_scores"]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, scores) if len(np.unique(y_test)) > 1 else 0.0

    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(f"AUC-ROC:   {auc:.4f}")

    cm = confusion_matrix(y_test, y_pred).tolist()
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    return {
        "model_name": "lstm_autoencoder",
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "auc_roc": round(auc, 4),
        "confusion_matrix": cm,
        "classification_report": report,
        "anomaly_scores": scores.tolist(),
    }


def evaluate_rul(X_test: np.ndarray, y_test_rul: np.ndarray) -> dict:
    """RUL Predictor degerlendirme."""
    print("\n=== RUL Predictor Degerlendirme ===")
    predictor = RULPredictor()
    predictor.load()

    metrics = predictor.evaluate(X_test, y_test_rul)
    print(f"RMSE: {metrics['rmse']:.2f}")
    print(f"MAE:  {metrics['mae']:.2f}")

    return {
        "model_name": "rul_predictor",
        "rmse": round(metrics["rmse"], 2),
        "mae": round(metrics["mae"], 2),
    }


def run_evaluation():
    """Tum modelleri degerlendir ve metrics.json kaydet."""
    dataset = prepare_dataset()
    X_test = dataset["X_test"]
    y_test = dataset["y_test_anomaly"]
    y_test_rul = dataset["y_test_rul"]

    # Model degerlendirmeleri
    if_metrics = evaluate_isolation_forest(X_test, y_test)
    lstm_metrics = evaluate_lstm(X_test, y_test, dataset["feature_count"])
    rul_metrics = evaluate_rul(X_test, y_test_rul)

    # Anomali skorlarini metrics.json'dan cikar (cok buyuk)
    if_metrics_clean = {k: v for k, v in if_metrics.items() if k != "anomaly_scores"}
    lstm_metrics_clean = {k: v for k, v in lstm_metrics.items() if k != "anomaly_scores"}

    # metrics.json olustur
    metrics = {
        "isolation_forest": if_metrics_clean,
        "lstm_autoencoder": lstm_metrics_clean,
        "rul_predictor": rul_metrics,
        "dataset": {
            "test_size": len(X_test),
            "anomaly_ratio": float(y_test.mean()),
            "feature_count": dataset["feature_count"],
            "sensor_columns": dataset["sensor_columns"],
        },
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    metrics_path = OUTPUT_DIR / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n=== Sonuclar ===")
    print(f"metrics.json kaydedildi: {metrics_path}")
    print(f"\nKarsilastirma:")
    print(f"{'Model':<20} {'F1':>8} {'AUC-ROC':>8} {'Precision':>10} {'Recall':>8}")
    print("-" * 56)
    print(f"{'Isolation Forest':<20} {if_metrics['f1_score']:>8.4f} {if_metrics['auc_roc']:>8.4f} {if_metrics['precision']:>10.4f} {if_metrics['recall']:>8.4f}")
    print(f"{'LSTM Autoencoder':<20} {lstm_metrics['f1_score']:>8.4f} {lstm_metrics['auc_roc']:>8.4f} {lstm_metrics['precision']:>10.4f} {lstm_metrics['recall']:>8.4f}")
    print(f"\nRUL Predictor - RMSE: {rul_metrics['rmse']:.2f}, MAE: {rul_metrics['mae']:.2f}")

    return metrics


if __name__ == "__main__":
    run_evaluation()
