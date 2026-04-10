"""
P1-202: Isolation Forest Anomali Tespit Modeli
- contamination=0.05, n_estimators=100
- 2D flatten (window → feature vector) ile calisir
- joblib ile kaydeder
"""

import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "saved"


class IsolationForestModel:
    def __init__(
        self,
        contamination: float = 0.05,
        n_estimators: int = 100,
        random_state: int = 42,
    ):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state,
            n_jobs=-1,
        )
        self.is_fitted = False

    def _flatten(self, X: np.ndarray) -> np.ndarray:
        """3D sliding window → 2D feature matrix."""
        if X.ndim == 3:
            return X.reshape(X.shape[0], -1)
        return X

    def fit(self, X_train: np.ndarray) -> "IsolationForestModel":
        """Modeli egit."""
        X_flat = self._flatten(X_train)
        print(f"Isolation Forest egitiliyor... (n={X_flat.shape[0]}, features={X_flat.shape[1]})")
        self.model.fit(X_flat)
        self.is_fitted = True
        print("Isolation Forest egitimi tamamlandi.")
        return self

    def predict(self, X: np.ndarray) -> dict:
        """
        Tahmin yap.
        Returns: {"predictions": array, "anomaly_scores": array, "is_anomaly": array}
        """
        X_flat = self._flatten(X)
        predictions = self.model.predict(X_flat)  # 1=normal, -1=anomaly
        scores = self.model.decision_function(X_flat)  # Dusuk skor = anomali

        # Skoru 0-1 araligina normalize et (1=kesinlikle anomali)
        anomaly_scores = 1 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-10)

        is_anomaly = predictions == -1

        return {
            "predictions": predictions,
            "anomaly_scores": anomaly_scores,
            "is_anomaly": is_anomaly,
        }

    def predict_single(self, x: np.ndarray) -> dict:
        """Tek bir ornek icin tahmin."""
        if x.ndim == 2:
            x = x.reshape(1, *x.shape)
        result = self.predict(x)
        return {
            "is_anomaly": bool(result["is_anomaly"][0]),
            "anomaly_score": float(result["anomaly_scores"][0]),
        }

    def save(self, path: Path | None = None):
        """Modeli kaydet."""
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        save_path = path or MODELS_DIR / "isolation_forest.joblib"
        joblib.dump(self.model, save_path)
        print(f"Model kaydedildi: {save_path}")

    def load(self, path: Path | None = None) -> "IsolationForestModel":
        """Modeli yukle."""
        load_path = path or MODELS_DIR / "isolation_forest.joblib"
        self.model = joblib.load(load_path)
        self.is_fitted = True
        print(f"Model yuklendi: {load_path}")
        return self


def train_isolation_forest(X_train: np.ndarray) -> IsolationForestModel:
    """Isolation Forest'i egit ve kaydet."""
    model = IsolationForestModel()
    model.fit(X_train)
    model.save()
    return model


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from data_prep import prepare_dataset

    dataset = prepare_dataset()
    model = train_isolation_forest(dataset["X_train"])

    # Test
    result = model.predict(dataset["X_test"])
    anomaly_rate = result["is_anomaly"].mean()
    print(f"\nTest seti anomali orani: {anomaly_rate:.2%}")
    print(f"Ortalama anomali skoru: {result['anomaly_scores'].mean():.4f}")
