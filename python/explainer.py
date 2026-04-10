"""
P1-209: SHAP Aciklama Modulu
- TreeExplainer ile Isolation Forest uzerinde calisir
- Her tahmin icin hangi sensorun anomaliye en cok katki yaptigini hesaplar
"""

import numpy as np
import shap
import joblib
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models" / "saved"


class SHAPExplainer:
    def __init__(self, sensor_columns: list[str] | None = None):
        self.explainer = None
        self.sensor_columns = sensor_columns or []
        self.is_loaded = False

    def load_model(self, model_path: Path | None = None) -> "SHAPExplainer":
        """Isolation Forest modelini yukle ve explainer olustur."""
        load_path = model_path or MODELS_DIR / "isolation_forest.joblib"
        model = joblib.load(load_path)
        self.explainer = shap.TreeExplainer(model)
        self.is_loaded = True
        print(f"SHAP Explainer yuklendi (model: {load_path})")
        return self

    def _get_feature_names(self, n_features: int) -> list[str]:
        """Feature isimlerini dondur."""
        if self.sensor_columns:
            # Sliding window: her sensor window_size kez tekrarlanir
            n_sensors = len(self.sensor_columns)
            if n_features > n_sensors:
                window_size = n_features // n_sensors
                names = []
                for step in range(window_size):
                    for sensor in self.sensor_columns:
                        names.append(f"{sensor}_t-{window_size - 1 - step}")
                return names[:n_features]
            return self.sensor_columns[:n_features]
        return [f"feature_{i}" for i in range(n_features)]

    def explain(self, X: np.ndarray) -> dict:
        """
        SHAP degerleri hesapla.
        X: 2D flatten edilmis feature matrix (n_samples, n_features)
        """
        if not self.is_loaded:
            raise RuntimeError("Explainer yuklenmedi. Once load_model() cagirin.")

        shap_values = self.explainer.shap_values(X)

        # Feature isimleri
        feature_names = self._get_feature_names(X.shape[1])

        return {
            "shap_values": shap_values,
            "feature_names": feature_names,
        }

    def explain_single(self, x: np.ndarray) -> dict:
        """
        Tek bir ornek icin SHAP aciklamasi.
        x: 2D (window_size, n_features) veya 1D flatten
        """
        if x.ndim == 2:
            x_flat = x.reshape(1, -1)
        elif x.ndim == 1:
            x_flat = x.reshape(1, -1)
        else:
            x_flat = x.reshape(1, -1)

        result = self.explain(x_flat)
        shap_vals = result["shap_values"][0]
        feature_names = result["feature_names"]

        # Sensor bazinda SHAP toplamalari (ayni sensorun farkli zaman adimlarini topla)
        sensor_shap = {}
        if self.sensor_columns:
            for name, val in zip(feature_names, shap_vals):
                # "temperature_inlet_t-29" → "temperature_inlet"
                sensor_name = name.rsplit("_t-", 1)[0] if "_t-" in name else name
                sensor_shap[sensor_name] = sensor_shap.get(sensor_name, 0) + abs(val)
        else:
            for name, val in zip(feature_names, shap_vals):
                sensor_shap[name] = float(val)

        # Sirala: en etkili sensor basta
        sorted_sensors = sorted(sensor_shap.items(), key=lambda x: abs(x[1]), reverse=True)
        top_feature = sorted_sensors[0][0] if sorted_sensors else "unknown"

        # Detayli per-feature SHAP (ilk window step degil, aggregated)
        shap_detail = {name: float(val) for name, val in sorted_sensors}

        return {
            "shap_values": shap_detail,
            "shap_top_feature": top_feature,
            "shap_top_value": float(sorted_sensors[0][1]) if sorted_sensors else 0.0,
            "explanation": f"Bu anomalide en etkili faktor: {top_feature}",
        }


def create_explainer(sensor_columns: list[str]) -> SHAPExplainer:
    """SHAP Explainer olustur ve modeli yukle."""
    explainer = SHAPExplainer(sensor_columns=sensor_columns)
    explainer.load_model()
    return explainer


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from data_prep import prepare_dataset

    dataset = prepare_dataset()
    explainer = create_explainer(dataset["sensor_columns"])

    # Ornek aciklama
    sample = dataset["X_test"][0]
    result = explainer.explain_single(sample)
    print(f"\nSHAP Aciklamasi:")
    print(f"  Top feature: {result['shap_top_feature']}")
    print(f"  Aciklama: {result['explanation']}")
    print(f"\n  Sensor SHAP degerleri:")
    for sensor, val in list(result["shap_values"].items())[:5]:
        print(f"    {sensor}: {val:.6f}")
