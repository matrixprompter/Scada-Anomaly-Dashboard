"""
P1-207: Canli Veri Simulatoru
- Her 2 saniyede bir sahte sensor okuma uret
- /predict endpoint'ine POST et
- Zamanla artan bozunma (degradation) egrisi simule eder
"""

import time
import random
import math
import argparse
import requests
import numpy as np
from datetime import datetime

API_URL = "http://localhost:8000"

DEVICES = [
    "DEVICE-001",
    "DEVICE-002",
    "DEVICE-003",
    "DEVICE-004",
    "DEVICE-005",
]

# Normal sensor degerleri (ortalama ve std)
SENSOR_BASELINES = {
    "temperature_inlet": {"mean": 540, "std": 5},
    "temperature_outlet": {"mean": 380, "std": 4},
    "pressure_main": {"mean": 165, "std": 2},
    "pressure_secondary": {"mean": 42, "std": 1.5},
    "flow_rate_steam": {"mean": 620, "std": 10},
    "flow_rate_water": {"mean": 580, "std": 8},
    "vibration_turbine": {"mean": 2.5, "std": 0.3},
    "vibration_pump": {"mean": 1.8, "std": 0.2},
    "rpm_turbine": {"mean": 3000, "std": 15},
    "power_output": {"mean": 450, "std": 8},
}


class DeviceSimulator:
    def __init__(self, device_id: str, degradation_rate: float = 0.001):
        self.device_id = device_id
        self.degradation_rate = degradation_rate
        self.cycle = 0
        self.health = 1.0  # 1.0 = tamamen saglikli, 0.0 = ariza

    def generate_reading(self) -> dict[str, float]:
        """Bir sensor okumasi uret."""
        self.cycle += 1

        # Gradual degradation
        self.health = max(0.0, self.health - self.degradation_rate)

        # Gunun saatine gore periyodik degisim
        hour = datetime.now().hour
        daily_factor = math.sin(2 * math.pi * hour / 24) * 0.02

        sensor_data = {}
        for sensor, baseline in SENSOR_BASELINES.items():
            # Normal deger + gurultu
            value = random.gauss(baseline["mean"], baseline["std"])

            # Gunluk periyodik degisim
            value *= 1 + daily_factor

            # Degradation etkisi
            if self.health < 0.5:
                # Sagligi bozuldukca sensorler anormal davranmaya baslar
                degradation_factor = (0.5 - self.health) * 2  # 0 → 1
                if sensor.startswith("vibration"):
                    # Titresim artar
                    value *= 1 + degradation_factor * 3
                elif sensor.startswith("temperature"):
                    # Sicaklik artar
                    value += degradation_factor * baseline["std"] * 5
                elif sensor == "power_output":
                    # Guc duser
                    value -= degradation_factor * baseline["std"] * 3

            # Rastgele anomali spike (%2 olasilik)
            if random.random() < 0.02:
                value *= random.uniform(1.3, 2.0)

            sensor_data[sensor] = round(value, 2)

        return sensor_data

    def reset(self):
        """Cihazi sifirla (bakim sonrasi)."""
        self.health = 1.0
        self.cycle = 0


def run_simulator(
    api_url: str = API_URL,
    interval: float = 2.0,
    max_cycles: int | None = None,
):
    """Simulatoru calistir."""
    simulators = {d: DeviceSimulator(d, degradation_rate=random.uniform(0.0005, 0.002)) for d in DEVICES}

    print(f"Simulator baslatildi!")
    print(f"  API: {api_url}")
    print(f"  Cihaz sayisi: {len(DEVICES)}")
    print(f"  Interval: {interval}s")
    print(f"  Max cycles: {max_cycles or 'sinirsiz'}")
    print()

    cycle = 0
    while True:
        cycle += 1
        if max_cycles and cycle > max_cycles:
            break

        # Rastgele bir cihaz sec
        device_id = random.choice(DEVICES)
        sim = simulators[device_id]
        sensor_data = sim.generate_reading()

        # /predict endpoint'ine gonder
        payload = {
            "device_id": device_id,
            "sensor_data": sensor_data,
        }

        try:
            response = requests.post(f"{api_url}/predict", json=payload, timeout=10)
            result = response.json()

            # Ozet ciktisi
            status = "ANOMALI" if result.get("is_anomaly") else "normal"
            score = result.get("score", 0)
            rul = result.get("rul_estimate")
            top_feat = result.get("shap_top_feature", "")

            rul_str = f"RUL={rul:.0f}" if rul else "RUL=N/A"
            print(
                f"[{cycle:04d}] {device_id} | {status:>7} | "
                f"score={score:.3f} | {rul_str} | "
                f"health={sim.health:.2f} | top={top_feat}"
            )

        except requests.exceptions.ConnectionError:
            print(f"[{cycle:04d}] BAGLANTI HATASI - API ({api_url}) calismiyor mu?")
        except Exception as e:
            print(f"[{cycle:04d}] HATA: {e}")

        time.sleep(interval)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SCADA Sensor Simulatoru")
    parser.add_argument("--url", default=API_URL, help="ML API URL")
    parser.add_argument("--interval", type=float, default=2.0, help="Okuma araligi (saniye)")
    parser.add_argument("--cycles", type=int, default=None, help="Maksimum dongu sayisi")
    args = parser.parse_args()

    run_simulator(api_url=args.url, interval=args.interval, max_cycles=args.cycles)
