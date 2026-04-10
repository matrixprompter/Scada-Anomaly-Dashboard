"""
NASA CMAPSS verisini ML API + Next.js API uzerinden Supabase'e yukler.
1. train_FD001.txt'yi okur
2. Her engine_unit'i bir DEVICE'a esler
3. ML API /predict ile anomali skoru + RUL tahmini alir
4. Next.js API /api/sensors ve /api/anomalies ile Supabase'e yazar
"""

import sys
import time
import argparse
from pathlib import Path
from datetime import datetime, timezone, timedelta

import numpy as np
import pandas as pd
import requests

DATA_DIR = Path(__file__).parent.parent / "data"
ML_API_URL = "http://localhost:8000"
NEXT_API_URL = "http://localhost:3000"

# CMAPSS kolon isimleri
CMAPSS_COLUMNS = (
    ["unit_id", "cycle"]
    + [f"op_setting_{i}" for i in range(1, 4)]
    + [f"sensor_{i}" for i in range(1, 22)]
)

SENSOR_COLUMNS = [f"sensor_{i}" for i in range(1, 22)]

# 100 engine unit -> 5 device eslesmesi
DEVICE_MAP = {
    0: "DEVICE-001",
    1: "DEVICE-002",
    2: "DEVICE-003",
    3: "DEVICE-004",
    4: "DEVICE-005",
}


def severity_from_score(score: float) -> str:
    if score >= 0.9:
        return "critical"
    elif score >= 0.7:
        return "high"
    elif score >= 0.5:
        return "medium"
    return "low"


def load_data() -> pd.DataFrame:
    train_path = DATA_DIR / "train_FD001.txt"
    if not train_path.exists():
        print(f"HATA: {train_path} bulunamadi!")
        sys.exit(1)

    df = pd.read_csv(train_path, sep=r"\s+", header=None, names=CMAPSS_COLUMNS)
    print(f"Veri yuklendi: {len(df)} satir, {df['unit_id'].nunique()} engine unit")
    return df


def get_valid_sensors(df: pd.DataFrame) -> list[str]:
    std = df[SENSOR_COLUMNS].std()
    valid = std[std > 0.01].index.tolist()
    print(f"Gecerli sensor sayisi: {len(valid)} / 21")
    return valid


def ingest(
    ml_url: str = ML_API_URL,
    next_url: str = NEXT_API_URL,
    max_units: int = 5,
    samples_per_unit: int = 50,
    delay: float = 0.05,
):
    df = load_data()
    valid_sensors = get_valid_sensors(df)

    units = sorted(df["unit_id"].unique())[:max_units]
    total_sent = 0
    total_anomaly = 0
    ml_errors = 0
    db_errors = 0

    # Zaman damgalarini son 7 gune yay (dashboard'da gorunsun)
    total_samples = max_units * samples_per_unit
    base_time = datetime.now(timezone.utc) - timedelta(days=7)
    time_step = timedelta(days=7) / total_samples

    print(f"\nIngest basliyor...")
    print(f"  ML API: {ml_url}")
    print(f"  Next.js API: {next_url}")
    print(f"  Unit sayisi: {len(units)}")
    print(f"  Unit basina ornek: {samples_per_unit}")
    print(f"  Sensorler: {valid_sensors}")
    print()

    sample_idx = 0
    for unit_id in units:
        device_id = DEVICE_MAP.get((unit_id - 1) % 5, "DEVICE-001")
        unit_data = df[df["unit_id"] == unit_id].sort_values("cycle")

        total_rows = len(unit_data)
        if total_rows <= samples_per_unit:
            sampled = unit_data
        else:
            indices = np.linspace(0, total_rows - 1, samples_per_unit, dtype=int)
            sampled = unit_data.iloc[indices]

        for _, row in sampled.iterrows():
            sensor_data = {col: float(row[col]) for col in valid_sensors}
            timestamp = (base_time + time_step * sample_idx).isoformat()
            sample_idx += 1

            # 1. ML API'den tahmin al
            try:
                resp = requests.post(
                    f"{ml_url}/predict",
                    json={"device_id": device_id, "sensor_data": sensor_data},
                    timeout=15,
                )
                if resp.status_code != 200:
                    ml_errors += 1
                    if ml_errors <= 3:
                        print(f"  ML HATA [{resp.status_code}]: {resp.text[:100]}")
                    continue
                result = resp.json()
            except requests.exceptions.ConnectionError:
                ml_errors += 1
                if ml_errors <= 1:
                    print(f"  ML API baglanti hatasi - {ml_url} calismiyor mu?")
                    return
                continue
            except Exception as e:
                ml_errors += 1
                if ml_errors <= 3:
                    print(f"  ML HATA: {e}")
                continue

            score = result.get("score", 0)
            is_anomaly = result.get("is_anomaly", False)
            rul = result.get("rul_estimate")
            shap_vals = result.get("shap_values")
            shap_top = result.get("shap_top_feature")

            # 2. Next.js API ile sensor_readings'e yaz
            try:
                sr = requests.post(
                    f"{next_url}/api/sensors",
                    json={
                        "device_id": device_id,
                        "timestamp": timestamp,
                        "sensor_data": sensor_data,
                        "anomaly_score": score,
                        "is_anomaly": is_anomaly,
                        "rul_estimate": rul,
                        "shap_values": shap_vals,
                    },
                    timeout=10,
                )
                if sr.status_code != 201:
                    db_errors += 1
                    if db_errors <= 3:
                        print(f"  DB sensor HATA [{sr.status_code}]: {sr.text[:100]}")
            except Exception as e:
                db_errors += 1
                if db_errors <= 3:
                    print(f"  DB sensor HATA: {e}")

            # 3. Anomali ise anomaly_events'e yaz
            if is_anomaly:
                total_anomaly += 1
                try:
                    ar = requests.post(
                        f"{next_url}/api/anomalies",
                        json={
                            "device_id": device_id,
                            "severity": severity_from_score(score),
                            "sensor_values": sensor_data,
                            "shap_top_feature": shap_top,
                        },
                        timeout=10,
                    )
                    if ar.status_code != 201:
                        db_errors += 1
                        if db_errors <= 5:
                            print(f"  DB anomaly HATA [{ar.status_code}]: {ar.text[:100]}")
                except Exception as e:
                    db_errors += 1

            # 4. Cihaz RUL + status guncelle
            if rul is not None:
                try:
                    new_status = "critical" if rul < 50 else "warning" if rul < 150 else "active"
                    dr = requests.patch(
                        f"{next_url}/api/devices",
                        json={
                            "device_id": device_id,
                            "current_rul": rul,
                            "status": new_status,
                        },
                        timeout=10,
                    )
                    if dr.status_code != 200:
                        db_errors += 1
                        if db_errors <= 5:
                            print(f"  RUL HATA [{dr.status_code}]: {dr.text[:100]}")
                except Exception as e:
                    db_errors += 1
                    if db_errors <= 5:
                        print(f"  RUL HATA: {e}")

            total_sent += 1

            if total_sent % 25 == 0:
                print(
                    f"  [{total_sent:04d}] unit={unit_id} -> {device_id} | "
                    f"anomaly={is_anomaly} | score={score:.3f} | rul={rul}"
                )

            if delay > 0:
                time.sleep(delay)

    # Son durum kontrolu: her cihazdaki guncel RUL'u goster
    print(f"\n--- Cihaz Durumlari ---")
    try:
        dr = requests.get(f"{next_url}/api/devices", timeout=10)
        if dr.status_code == 200:
            for dev in dr.json().get("data", []):
                rul_val = dev.get("current_rul")
                st = dev.get("status", "?")
                print(f"  {dev['id']} ({dev['name']}): RUL={rul_val}, status={st}")
    except Exception:
        print("  (cihaz durumu alinamadi)")

    print(f"\n=== Ingest Tamamlandi ===")
    print(f"  Gonderilen: {total_sent}")
    print(f"  Anomali:    {total_anomaly}")
    print(f"  ML hata:    {ml_errors}")
    print(f"  DB hata:    {db_errors}")
    print(f"\nDashboard'u yenileyin: http://localhost:3000")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NASA CMAPSS -> Supabase Ingestion")
    parser.add_argument("--ml-url", default=ML_API_URL, help="ML API URL")
    parser.add_argument("--next-url", default=NEXT_API_URL, help="Next.js API URL")
    parser.add_argument("--units", type=int, default=5, help="Kac engine unit islenir")
    parser.add_argument("--samples", type=int, default=50, help="Unit basina ornek sayisi")
    parser.add_argument("--delay", type=float, default=0.05, help="Istekler arasi bekleme (sn)")
    args = parser.parse_args()

    ingest(
        ml_url=args.ml_url,
        next_url=args.next_url,
        max_units=args.units,
        samples_per_unit=args.samples,
        delay=args.delay,
    )
