"""
P1-208: RUL (Remaining Useful Life) Tahmin Modulu
- GradientBoostingRegressor
- RUL_FD001.txt etiketleri ile egitim
- RMSE metrigi
"""

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error
import joblib
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "saved"


class RULPredictor:
    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: int = 4,
        learning_rate: float = 0.1,
        random_state: int = 42,
        subsample: float = 0.8,
    ):
        self.model = GradientBoostingRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            random_state=random_state,
            subsample=subsample,
        )
        self.is_fitted = False

    def _flatten(self, X: np.ndarray) -> np.ndarray:
        """3D sliding window → 2D: son adim + istatistikler."""
        if X.ndim == 3:
            last_step = X[:, -1, :]           # Son zaman adimi
            mean_vals = X.mean(axis=1)         # Window ortalamasi
            std_vals = X.std(axis=1)           # Window standart sapmasi
            return np.hstack([last_step, mean_vals, std_vals])
        return X

    def fit(self, X_train: np.ndarray, y_train_rul: np.ndarray) -> "RULPredictor":
        """RUL tahmini icin modeli egit."""
        X_flat = self._flatten(X_train)
        print(f"RUL Predictor egitiliyor... (n={X_flat.shape[0]})")
        self.model.fit(X_flat, y_train_rul)
        self.is_fitted = True

        # Train RMSE
        y_pred = self.model.predict(X_flat)
        rmse = float(np.sqrt(mean_squared_error(y_train_rul, y_pred)))
        print(f"Train RMSE: {rmse:.2f}")
        return self

    def predict(self, X: np.ndarray) -> dict:
        """RUL tahmini yap."""
        X_flat = self._flatten(X)
        predictions = self.model.predict(X_flat)
        predictions = np.clip(predictions, 0, None)  # RUL negatif olamaz

        # Confidence: feature importance bazli basit bir gosterge
        confidence = np.ones(len(predictions)) * 0.85
        # Cok dusuk/yuksek tahminlerde confidence azalt
        median_rul = np.median(predictions)
        deviation = np.abs(predictions - median_rul) / (median_rul + 1e-10)
        confidence = np.clip(0.95 - deviation * 0.3, 0.5, 0.95)

        return {
            "rul_estimates": predictions,
            "confidence": confidence,
        }

    def predict_single(self, x: np.ndarray) -> dict:
        """Tek ornek icin RUL tahmini."""
        if x.ndim == 2:
            x = x.reshape(1, *x.shape)
        result = self.predict(x)
        return {
            "rul_estimate": float(result["rul_estimates"][0]),
            "confidence": float(result["confidence"][0]),
        }

    def evaluate(self, X_test: np.ndarray, y_test_rul: np.ndarray) -> dict:
        """Test seti uzerinde degerlendirme."""
        X_flat = self._flatten(X_test)
        y_pred = self.model.predict(X_flat)
        y_pred = np.clip(y_pred, 0, None)

        rmse = float(np.sqrt(mean_squared_error(y_test_rul, y_pred)))
        mae = float(np.mean(np.abs(y_test_rul - y_pred)))

        return {"rmse": rmse, "mae": mae}

    def save(self, path: Path | None = None):
        """Modeli kaydet."""
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        save_path = path or MODELS_DIR / "rul_predictor.joblib"
        joblib.dump(self.model, save_path)
        print(f"Model kaydedildi: {save_path}")

    def load(self, path: Path | None = None) -> "RULPredictor":
        """Modeli yukle."""
        load_path = path or MODELS_DIR / "rul_predictor.joblib"
        self.model = joblib.load(load_path)
        self.is_fitted = True
        print(f"Model yuklendi: {load_path}")
        return self


def train_rul_predictor(
    X_train: np.ndarray, y_train_rul: np.ndarray
) -> RULPredictor:
    """RUL Predictor'i egit ve kaydet."""
    predictor = RULPredictor()
    predictor.fit(X_train, y_train_rul)
    predictor.save()
    return predictor


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from data_prep import prepare_dataset

    dataset = prepare_dataset()
    predictor = train_rul_predictor(
        dataset["X_train"], dataset["y_train_rul"]
    )

    # Test
    metrics = predictor.evaluate(dataset["X_test"], dataset["y_test_rul"])
    print(f"\nTest RMSE: {metrics['rmse']:.2f}")
    print(f"Test MAE:  {metrics['mae']:.2f}")

    # Ornek tahmin
    sample = dataset["X_test"][:1]
    result = predictor.predict_single(sample[0])
    print(f"\nOrnek tahmin - RUL: {result['rul_estimate']:.1f}, Confidence: {result['confidence']:.2f}")
