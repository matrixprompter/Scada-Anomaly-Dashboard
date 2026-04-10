"""
P1-206: Supabase async client
- sensor_readings, anomaly_events, devices tablolarina kayit
"""

import os
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env.local'da tanimli olmali"
            )
        _client = create_client(url, key)
    return _client


def save_sensor_reading(
    device_id: str,
    sensor_data: dict,
    anomaly_score: float,
    is_anomaly: bool,
    rul_estimate: float | None = None,
    shap_values: dict | None = None,
    embedding: list[float] | None = None,
) -> dict | None:
    """sensor_readings tablosuna kayit ekle."""
    try:
        client = get_client()
        record = {
            "device_id": device_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sensor_data": sensor_data,
            "anomaly_score": anomaly_score,
            "is_anomaly": is_anomaly,
            "rul_estimate": rul_estimate,
            "shap_values": shap_values,
        }
        if embedding:
            record["embedding"] = embedding

        result = client.table("sensor_readings").insert(record).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase] sensor_readings kayit hatasi: {e}")
        return None


def save_anomaly_event(
    device_id: str,
    severity: str,
    sensor_values: dict,
    shap_top_feature: str | None = None,
    model_version: str = "v1.0.0",
) -> dict | None:
    """anomaly_events tablosuna kayit ekle."""
    try:
        client = get_client()
        record = {
            "device_id": device_id,
            "severity": severity,
            "sensor_values": sensor_values,
            "shap_top_feature": shap_top_feature,
            "model_version": model_version,
        }
        result = client.table("anomaly_events").insert(record).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase] anomaly_events kayit hatasi: {e}")
        return None


def update_device_rul(device_id: str, rul_estimate: float) -> dict | None:
    """devices tablosundaki current_rul degerini guncelle."""
    try:
        client = get_client()
        result = (
            client.table("devices")
            .update({
                "current_rul": rul_estimate,
                "last_seen": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", device_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase] devices guncelleme hatasi: {e}")
        return None


def determine_severity(anomaly_score: float) -> str:
    """Anomali skorundan severity belirle."""
    if anomaly_score >= 0.9:
        return "critical"
    elif anomaly_score >= 0.7:
        return "high"
    elif anomaly_score >= 0.5:
        return "medium"
    return "low"
