"""
P1-201: Veri Hazirlama
- NASA CMAPSS train_FD001.txt ve RUL_FD001.txt okuma
- Sentetik SCADA verisi destegi
- MinMaxScaler normalizasyon
- 30-adimli sliding window
- Train/test split (%80/%20)
"""

import os
import zipfile
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
import joblib
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
CMAPSS_ZIP = DATA_DIR / "6. Turbofan Engine Degradation Simulation Data Set" / "CMAPSSData.zip"
MODELS_DIR = Path(__file__).parent / "models" / "saved"
WINDOW_SIZE = 30
TEST_RATIO = 0.2
RANDOM_STATE = 42

# CMAPSS sensor kolonlari
CMAPSS_COLUMNS = (
    ["unit_id", "cycle"]
    + [f"op_setting_{i}" for i in range(1, 4)]
    + [f"sensor_{i}" for i in range(1, 22)]
)

SENSOR_COLUMNS = [f"sensor_{i}" for i in range(1, 22)]

# Sentetik SCADA sensor kolonlari
SCADA_SENSOR_COLUMNS = [
    "temperature_inlet",
    "temperature_outlet",
    "pressure_main",
    "pressure_secondary",
    "flow_rate_steam",
    "flow_rate_water",
    "vibration_turbine",
    "vibration_pump",
    "rpm_turbine",
    "power_output",
]


def extract_cmapss_zip():
    """Zip dosyasindan CMAPSS txt dosyalarini cikarir."""
    if CMAPSS_ZIP.exists():
        print(f"CMAPSS zip'ten cikariliyor: {CMAPSS_ZIP}")
        with zipfile.ZipFile(CMAPSS_ZIP, "r") as zf:
            for name in zf.namelist():
                if name.endswith(".txt"):
                    target = DATA_DIR / Path(name).name
                    if not target.exists():
                        with open(target, "wb") as f:
                            f.write(zf.read(name))
        print("Zip cikarildi.")


def load_cmapss_data() -> tuple[pd.DataFrame, np.ndarray]:
    """NASA CMAPSS train_FD001.txt ve RUL_FD001.txt yukle."""
    train_path = DATA_DIR / "train_FD001.txt"
    rul_path = DATA_DIR / "RUL_FD001.txt"

    # If txt doesn't exist, try extracting from zip
    if not train_path.exists():
        extract_cmapss_zip()

    if not train_path.exists():
        raise FileNotFoundError(
            f"{train_path} bulunamadi. NASA CMAPSS verisini data/ klasorune indirin."
        )

    # train_FD001.txt: boslukla ayrilmis, basligi yok
    df = pd.read_csv(train_path, sep=r"\s+", header=None, names=CMAPSS_COLUMNS)

    # Eksik degerleri doldur (varsa)
    df = df.fillna(method="ffill").fillna(method="bfill")

    # Sabit veya dusuk varyansi olan sensorleri cikar
    sensor_std = df[SENSOR_COLUMNS].std()
    valid_sensors = sensor_std[sensor_std > 0.01].index.tolist()

    # RUL etiketleri
    rul_labels = None
    if rul_path.exists():
        rul_labels = pd.read_csv(rul_path, header=None).values.flatten()

    return df, rul_labels


def load_scada_data() -> pd.DataFrame:
    """Sentetik SCADA verisini yukle."""
    scada_path = DATA_DIR / "synthetic_scada_data.csv"

    if not scada_path.exists():
        raise FileNotFoundError(
            f"{scada_path} bulunamadi. Once python/generate_synthetic_data.py calistirin."
        )

    df = pd.read_csv(scada_path, parse_dates=["timestamp"])
    return df


def compute_rul_labels(df: pd.DataFrame) -> pd.DataFrame:
    """Her birim icin RUL (Remaining Useful Life) hesapla."""
    max_cycles = df.groupby("unit_id")["cycle"].max().reset_index()
    max_cycles.columns = ["unit_id", "max_cycle"]
    df = df.merge(max_cycles, on="unit_id")
    df["rul"] = df["max_cycle"] - df["cycle"]
    df.drop("max_cycle", axis=1, inplace=True)
    return df


def normalize_data(
    df: pd.DataFrame, sensor_cols: list[str], fit: bool = True, scaler=None
) -> tuple[pd.DataFrame, MinMaxScaler]:
    """MinMaxScaler ile normalize et."""
    if fit or scaler is None:
        scaler = MinMaxScaler(feature_range=(0, 1))
        df[sensor_cols] = scaler.fit_transform(df[sensor_cols])
    else:
        df[sensor_cols] = scaler.transform(df[sensor_cols])
    return df, scaler


def create_sliding_windows(
    data: np.ndarray, window_size: int = WINDOW_SIZE
) -> np.ndarray:
    """Sliding window olustur. Shape: (n_samples, window_size, n_features)"""
    if len(data) < window_size:
        # Kisa veriler icin padding
        padded = np.zeros((window_size, data.shape[1]))
        padded[-len(data) :] = data
        return padded.reshape(1, window_size, -1)

    windows = []
    for i in range(len(data) - window_size + 1):
        windows.append(data[i : i + window_size])
    return np.array(windows)


def prepare_cmapss_dataset(
    window_size: int = WINDOW_SIZE,
) -> dict:
    """
    CMAPSS verisini tam pipeline ile hazirla.
    Returns:
        {
            "X_train", "X_test": sliding window arrays,
            "y_train_anomaly", "y_test_anomaly": anomali etiketleri,
            "y_train_rul", "y_test_rul": RUL etiketleri,
            "scaler": fitted MinMaxScaler,
            "sensor_columns": kullanilan sensor isimleri,
            "feature_count": sensor sayisi,
        }
    """
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    df, rul_test_labels = load_cmapss_data()
    df = compute_rul_labels(df)

    # Sabit sensorleri filtrele
    sensor_std = df[SENSOR_COLUMNS].std()
    valid_sensors = sensor_std[sensor_std > 0.01].index.tolist()

    # Normalize et
    df, scaler = normalize_data(df, valid_sensors, fit=True)
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")

    # Anomali etiketi: RUL < 30 olan satirlar anomali
    df["is_anomaly"] = (df["rul"] < 30).astype(int)

    # Birim bazinda sliding window olustur
    all_windows = []
    all_anomaly_labels = []
    all_rul_labels = []

    for unit_id in df["unit_id"].unique():
        unit_data = df[df["unit_id"] == unit_id].sort_values("cycle")
        sensor_data = unit_data[valid_sensors].values
        anomaly_data = unit_data["is_anomaly"].values
        rul_data = unit_data["rul"].values

        windows = create_sliding_windows(sensor_data, window_size)
        # Her window icin son adimin etiketini kullan
        for i in range(len(windows)):
            idx = min(i + window_size - 1, len(anomaly_data) - 1)
            all_anomaly_labels.append(anomaly_data[idx])
            all_rul_labels.append(rul_data[idx])

        all_windows.append(windows)

    X = np.concatenate(all_windows, axis=0)
    y_anomaly = np.array(all_anomaly_labels)
    y_rul = np.array(all_rul_labels)

    # Train/test split
    X_train, X_test, y_train_a, y_test_a, y_train_r, y_test_r = train_test_split(
        X, y_anomaly, y_rul, test_size=TEST_RATIO, random_state=RANDOM_STATE
    )

    print(f"Dataset hazir:")
    print(f"  Sensor sayisi: {len(valid_sensors)}")
    print(f"  Window boyutu: {window_size}")
    print(f"  Train: {X_train.shape[0]} ornek")
    print(f"  Test:  {X_test.shape[0]} ornek")
    print(f"  Anomali orani (train): {y_train_a.mean():.2%}")
    print(f"  Anomali orani (test):  {y_test_a.mean():.2%}")

    return {
        "X_train": X_train,
        "X_test": X_test,
        "y_train_anomaly": y_train_a,
        "y_test_anomaly": y_test_a,
        "y_train_rul": y_train_r,
        "y_test_rul": y_test_r,
        "scaler": scaler,
        "sensor_columns": valid_sensors,
        "feature_count": len(valid_sensors),
    }


def prepare_scada_dataset(
    window_size: int = WINDOW_SIZE,
) -> dict:
    """
    Sentetik SCADA verisini pipeline ile hazirla.
    CMAPSS yoksa alternatif olarak kullanilir.
    """
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    df = load_scada_data()
    sensor_cols = SCADA_SENSOR_COLUMNS

    # Normalize
    df, scaler = normalize_data(df, sensor_cols, fit=True)
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")

    all_windows = []
    all_anomaly_labels = []

    for device_id in df["device_id"].unique():
        dev_data = df[df["device_id"] == device_id].sort_values("timestamp")
        sensor_data = dev_data[sensor_cols].values
        anomaly_data = dev_data["is_anomaly"].astype(int).values

        windows = create_sliding_windows(sensor_data, window_size)
        for i in range(len(windows)):
            idx = min(i + window_size - 1, len(anomaly_data) - 1)
            all_anomaly_labels.append(anomaly_data[idx])

        all_windows.append(windows)

    X = np.concatenate(all_windows, axis=0)
    y_anomaly = np.array(all_anomaly_labels)
    # Sentetik veri icin sahte RUL
    y_rul = np.random.uniform(20, 300, size=len(y_anomaly))

    X_train, X_test, y_train_a, y_test_a, y_train_r, y_test_r = train_test_split(
        X, y_anomaly, y_rul, test_size=TEST_RATIO, random_state=RANDOM_STATE
    )

    print(f"SCADA dataset hazir:")
    print(f"  Sensor sayisi: {len(sensor_cols)}")
    print(f"  Train: {X_train.shape[0]} ornek")
    print(f"  Test:  {X_test.shape[0]} ornek")

    return {
        "X_train": X_train,
        "X_test": X_test,
        "y_train_anomaly": y_train_a,
        "y_test_anomaly": y_test_a,
        "y_train_rul": y_train_r,
        "y_test_rul": y_test_r,
        "scaler": scaler,
        "sensor_columns": sensor_cols,
        "feature_count": len(sensor_cols),
    }


def prepare_dataset(window_size: int = WINDOW_SIZE) -> dict:
    """CMAPSS varsa onu, yoksa SCADA verisini kullan."""
    cmapss_path = DATA_DIR / "train_FD001.txt"
    if cmapss_path.exists():
        print("NASA CMAPSS verisi bulundu, kullaniliyor...")
        return prepare_cmapss_dataset(window_size)
    else:
        print("CMAPSS bulunamadi, sentetik SCADA verisi kullaniliyor...")
        return prepare_scada_dataset(window_size)


if __name__ == "__main__":
    dataset = prepare_dataset()
    print(f"\nX_train shape: {dataset['X_train'].shape}")
    print(f"X_test shape:  {dataset['X_test'].shape}")
