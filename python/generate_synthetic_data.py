"""
Sentetik SCADA zaman serisi verisi uretici.
Termal santral icin 10 sensor: sicaklik, basinc, akis hizi, titresim vb.
Her ~500 okumada gercekci anomaliler enjekte eder.
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)

NUM_READINGS = 10000
ANOMALY_INTERVAL = 500
NUM_DEVICES = 5

SENSORS = {
    "temperature_inlet": {"mean": 540, "std": 5, "unit": "°C"},
    "temperature_outlet": {"mean": 380, "std": 4, "unit": "°C"},
    "pressure_main": {"mean": 165, "std": 2, "unit": "bar"},
    "pressure_secondary": {"mean": 42, "std": 1.5, "unit": "bar"},
    "flow_rate_steam": {"mean": 620, "std": 10, "unit": "t/h"},
    "flow_rate_water": {"mean": 580, "std": 8, "unit": "t/h"},
    "vibration_turbine": {"mean": 2.5, "std": 0.3, "unit": "mm/s"},
    "vibration_pump": {"mean": 1.8, "std": 0.2, "unit": "mm/s"},
    "rpm_turbine": {"mean": 3000, "std": 15, "unit": "rpm"},
    "power_output": {"mean": 450, "std": 8, "unit": "MW"},
}


def generate_device_data(device_id: str, num_readings: int) -> pd.DataFrame:
    timestamps = pd.date_range(
        start="2024-01-01", periods=num_readings, freq="2s"
    )

    data = {"timestamp": timestamps, "device_id": device_id}

    for sensor_name, params in SENSORS.items():
        base = np.random.normal(params["mean"], params["std"], num_readings)
        # Gunluk periyodik degisim
        daily_cycle = np.sin(np.linspace(0, 2 * np.pi * (num_readings / 43200), num_readings))
        base += daily_cycle * params["std"] * 0.5
        data[sensor_name] = base

    df = pd.DataFrame(data)

    # Anomali enjeksiyonu
    anomaly_indices = []
    for i in range(ANOMALY_INTERVAL, num_readings, ANOMALY_INTERVAL):
        anomaly_type = np.random.choice(["spike", "drift", "dropout", "correlation_break"])
        window = range(i, min(i + 20, num_readings))
        anomaly_indices.extend(window)

        if anomaly_type == "spike":
            sensor = np.random.choice(list(SENSORS.keys()))
            df.loc[list(window), sensor] *= np.random.uniform(1.5, 2.5)
        elif anomaly_type == "drift":
            sensor = np.random.choice(list(SENSORS.keys()))
            drift = np.linspace(0, SENSORS[sensor]["std"] * 5, len(window))
            df.loc[list(window), sensor] += drift
        elif anomaly_type == "dropout":
            sensor = np.random.choice(list(SENSORS.keys()))
            df.loc[list(window), sensor] = 0
        elif anomaly_type == "correlation_break":
            df.loc[list(window), "temperature_inlet"] += 50
            df.loc[list(window), "temperature_outlet"] -= 30

    df["is_anomaly"] = False
    df.loc[anomaly_indices, "is_anomaly"] = True

    return df


def main():
    output_dir = Path(__file__).parent.parent / "data"
    output_dir.mkdir(exist_ok=True)

    all_data = []
    for i in range(1, NUM_DEVICES + 1):
        device_id = f"DEVICE-{i:03d}"
        print(f"Generating data for {device_id}...")
        df = generate_device_data(device_id, NUM_READINGS)
        all_data.append(df)

    combined = pd.concat(all_data, ignore_index=True)
    output_path = output_dir / "synthetic_scada_data.csv"
    combined.to_csv(output_path, index=False)

    anomaly_count = combined["is_anomaly"].sum()
    total = len(combined)
    print(f"\nDone! {total} readings, {anomaly_count} anomalies ({anomaly_count/total*100:.1f}%)")
    print(f"Saved to: {output_path}")


if __name__ == "__main__":
    main()
