# SCADA Anomali Tespiti & Gercek Zamanli Dashboard

Endustriyel SCADA/EKS sistemlerinden gelen sensor verilerini makine ogrenimi ile analiz eden, anomali tespiti ve RUL (Remaining Useful Life) tahmini yapan, sonuclari gercek zamanli dashboard uzerinde goruntuleyen uygulama.

## Mimari

```
┌──────────────────────────────────────────────────────┐
│                    Frontend                          │
│            Next.js 16.2 (App Router)                 │
│         Tailwind CSS 4 + shadcn/ui                   │
│        Chart.js + D3.js Gorsellestirme               │
│     iOS-style tek sayfa dashboard (polling 10s)      │
├──────────────────────────────────────────────────────┤
│                   API Katmani                        │
│            Next.js API Routes (Proxy)                │
├────────────────────┬─────────────────────────────────┤
│   ML API (FastAPI) │      Veritabani (Supabase)      │
│  Isolation Forest  │   PostgreSQL + pgvector         │
│  LSTM Autoencoder  │   Realtime Subscriptions        │
│  RUL Predictor     │   Row Level Security            │
│  SHAP Explainer    │                                 │
└────────────────────┴─────────────────────────────────┘
```

## Teknik Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16.2, TypeScript 5.7, Tailwind CSS 4, shadcn/ui |
| Grafikler | Chart.js 4.4 + react-chartjs-2, D3.js 7.x |
| ML API | Python 3.13, FastAPI 0.115 |
| ML Kutuphaneleri | scikit-learn, PyTorch, SHAP |
| Veritabani | Supabase (PostgreSQL + pgvector) |
| Deployment | Vercel (frontend) + Railway (Python API) |

## Ozellikler

### Sensör Kontrol & Session Bazlı Çalışma

- **Tek Buton, 3 Aşama**: Dashboard header'daki buton sırasıyla:
  1. **Sensörleri Aç** — ML API sunucusunu port 8000 üzerinde başlatır (FastAPI + Uvicorn)
  2. **Sensörlerden Veri Çek** — NASA CMAPSS verilerini ML API üzerinden işleyip Supabase'e aktarır (`ingest_cmapss.py`)
  3. **Durdur** — Tüm scriptleri durdurur, Supabase'deki realtime verileri (sensor_readings + anomaly_events) temizler, cihaz durumlarını sıfırlar ve bildirim sayacını resetler
- **Tamamlandı Durumu**: Veri aktarımı bittiğinde buton "Tamamlandı — Tekrar Çek" olarak değişir, tekrar tıklanabilir
- **Session Bazlı**: Her oturum sıfırdan başlar, Durdur butonu ile temiz bir başlangıç garanti edilir
- **API Endpointleri**: `/api/script/start-server`, `/api/script/start-ingest`, `/api/script/stop`, `/api/script/status`

### Etkileşimli Onboarding (Rehber)

- **8 Adımlı Rehber**: İlk ziyarette otomatik başlar, her kart/bölüm üzerinde popup ile açıklama gösterir
- **Session Bazlı**: `sessionStorage` ile kontrol edilir, her oturum için bir kez gösterilir
- **Tekrar Başlatma**: Header'daki `?` ikonuna tıklayarak rehberi tekrar başlatabilirsiniz
- **Adımlar**: Sensör Kontrol → KPI Kartları → RUL Gauge → Sensör Grafiği → Anomali Dağılımı → Anomali Trendi → Anomali Tablosu → Cihazlar
- **RUL Açıklaması**: RUL = Remaining Useful Life. RUL 164 = motor 164 döngü (uçuş) daha dayanabilir. >150 Sağlıklı, 50-150 Dikkat, <50 Kritik
- **Navigasyon**: İleri/Geri butonları, adım noktaları (tıklayarak atlama), Atla butonu

### ML & Anomali

- **Anomali Tespiti**: Isolation Forest + LSTM Autoencoder ile cift katmanli anomali algilama
- **RUL Tahmini**: GradientBoosting ile kalan faydali omur tahmini (dongu cinsinden)
- **SHAP Aciklanabilirlik**: Her anomali icin hangi sensorun ne kadar etkiledigini goruntuleme
- **Benzer Anomali Arama**: pgvector ile vektorel benzerlik aramasi

### Dashboard & UI

- **iOS-style Tasarim**: Backdrop-blur, frosted glass kartlar, rounded-2xl, shadow transitions
- **Tek Sayfa Dashboard**: Sidebar yok, tum bilgiler `/` sayfasinda
- **Gercek Zamanli**: 10 saniye polling + Supabase Realtime ile otomatik guncelleme
- **14 Sensor Destegi**: Turkce etiketli sensor secici (pill butonlar), renk eslesmeli grafik cizgileri
- **Anomali Highlight**: Anomali tespit edilen cihazlar turuncu border + "Anomali" badge ile vurgulanır (RUL Gauge + Cihaz kartları). Anomali olan cihazlarda "Bakım Gerekmiyor" yerine "Anomali tespit edildi — kontrol gerekli" gösterilir
- **3 Sütunlu Anomali Tablosu**: Cihaz | Uyarı (severity + sensör) | Tarih — max 10 kayıt
- **RUL Bazlı Durum**: Cihaz durumu DB status'una değil, gerçek RUL değerine göre belirlenir (>150 Sağlıklı, 50-150 Dikkat, <50 Kritik). RUL verisi yokken cihazlar "Aktif" olarak gösterilir
- **Kalıcı Bildirimler**: Anomali bildirimleri localStorage'da saklanır, sayfa yenilenince sıfırlanmaz. "Durdur" butonu bildirim sayacını da sıfırlar
- **Dark Mode**: next-themes ile karanlik/aydinlik tema destegi
- **Mobil Uyumlu**: Responsive tasarim
- **Web Notifications**: Kritik/yuksek anomaliler icin tarayici bildirimi

### Ek Gorsellestirmeler

- **Sensor Isi Haritasi**: D3.js ile sensor/saat bazli anomali yogunluk haritasi
- **Korelasyon Matrisi**: D3.js ile sensor-arasi korelasyon gorsellestirme
- **Donem Karsilastirmasi**: Onceki donem ile anomali istatistiklerini karsilastirma
- **SHAP Paneli**: Anomali bazinda sensor etki analizi (horizontal bar chart)

## Kurulum

### Onkosullar

- Node.js 20+
- Python 3.13+
- Supabase hesabi (ucretsiz tier yeterli)

### 1. Repoyu Klonla

```bash
git clone https://github.com/<kullanici>/scada-anomaly-dashboard.git
cd scada-anomaly-dashboard
```

### 2. Frontend Bagimliliklari

```bash
npm install
```

### 3. Python Ortami

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Ortam Degiskenleri

`.env.local.example` dosyasini `.env.local` olarak kopyala ve degerleri doldur:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ML_API_URL=http://localhost:8000
```

### 5. Veritabani (Supabase Migration)

Supabase projenizi olusturduktan sonra tablolari olusturmak icin:

**Yontem A — SQL Editor (Onerilen):**

1. Supabase Dashboard → SQL Editor'a git
2. `supabase/migrations/000_all_migrations.sql` dosyasinin icerigini kopyala-yapistir
3. "Run" butonuna bas

**Yontem B — Tek tek migration dosyalari:**

`supabase/migrations/` klasorundeki dosyalari sirayla calistir (001 → 008).

Bu migration'lar sunlari olusturur:

| Oge | Aciklama |
|-----|----------|
| pgvector extension | Vektorel benzerlik aramasi icin |
| `sensor_readings` | Sensor okumalari + anomali skorlari + RUL + SHAP |
| `anomaly_events` | Anomali olaylari (severity, SHAP top feature) |
| `model_metrics` | ML model performans metrikleri |
| `devices` | Cihaz bilgileri ve guncel RUL |
| RLS politikalari | Anon: SELECT, Authenticated: full CRUD |
| pgvector index | ivfflat cosine similarity index |
| `match_similar_anomalies()` | Benzer anomali arama RPC fonksiyonu |

**Seed data (ornek cihazlar):**

Supabase SQL Editor'da `supabase/seed/001_seed_devices.sql` ve `002_seed_model_metrics.sql` dosyalarini calistir.

5 cihaz tanimi:

| ID | Isim | Konum | Tip |
|----|------|-------|-----|
| DEVICE-001 | Turbin A1 | Makine Dairesi - Kat 1 | Buhar turbini |
| DEVICE-002 | Turbin A2 | Makine Dairesi - Kat 1 | Buhar turbini |
| DEVICE-003 | Pompa B1 | Su Aritma Unitesi | Besleme pompasi |
| DEVICE-004 | Kompresor C1 | Hava Kompresor Odasi | Hava kompresoru |
| DEVICE-005 | Jenerator D1 | Jenerator Binasi | Jenerator |

### 6. Veri Seti

**NASA CMAPSS (gercekci veri):**

1. https://ti.arc.nasa.gov/tech/dash/groups/pcoe/prognostic-data-repository adresinden "Turbofan Engine Degradation Simulation Data Set" indir
2. ZIP icinden su dosyalari `data/` klasorune cikar:
   - `train_FD001.txt` — `train_FD004.txt` (egitim verisi)
   - `RUL_FD001.txt` — `RUL_FD004.txt` (RUL etiketleri)
   - `test_FD001.txt` — `test_FD004.txt` (test verisi)

**Sentetik Veri (alternatif):**

```bash
python python/generate_synthetic_data.py
```

### 7. ML Modelleri Egit

```bash
# Veri hazirla + modelleri egit (CMAPSS yoksa sentetik veri kullanilir)
python python/models/isolation_forest.py
python python/models/lstm_autoencoder.py
python python/models/rul_predictor.py

# Model degerlendirme (metrics.json olusturur)
python python/evaluate.py
```

Egitim sonrasi `python/models/saved/` klasorunde su dosyalar olusur:

| Dosya | Model | Boyut |
|-------|-------|-------|
| `isolation_forest.joblib` | Isolation Forest anomali tespiti | ~1 MB |
| `lstm_autoencoder.pth` | LSTM Autoencoder anomali tespiti | ~200 KB |
| `rul_predictor.joblib` | GradientBoosting RUL tahmini | ~5 MB |
| `scaler.joblib` | MinMaxScaler (normalizasyon) | ~2 KB |

### 8. Calistir

**Tek Terminal Yeterli — Dashboard Uzerinden Kontrol:**

```bash
npm run dev
```

Tarayicida `http://localhost:3000` acin. Dashboard header'daki buton ile:

1. **"Sensoerleri Ac"** tiklayin → ML API (port 8000) baslar
2. Buton **"Sensorlerden Veri Cek"** olarak degisir → tiklayin → NASA CMAPSS verisi Supabase'e akmaya baslar
3. **"Durdur"** butonu ile scriptleri durdurup verileri temizleyebilirsiniz

> Ilk ziyarette otomatik onboarding rehberi baslar. Tum kartlari ve islevlerini adim adim ogrenebilirsiniz.

**Alternatif: Manuel Terminal ile Calistirma (3 terminal):**

**Terminal 1 — Frontend (port 3000):**

```bash
npm run dev
```

**Terminal 2 — ML API (port 8000):**

```bash
cd python
..\venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

> Not: ML API startup'ta scaler.joblib'den sensor sayisini okur.
> CMAPSS ile egitilmisse 14 sensor (sabit varyansli sensorler filtrelenir),
> sentetik SCADA ile egitilmisse 10 sensor kullanir.

**Terminal 3 — NASA Verisi Yukleme (Supabase'e veri gonderir):**

```bash
cd python
..\venv\Scripts\python ingest_cmapss.py --units 5 --samples 50
```

Bu script su akisi izler:
1. `train_FD001.txt`'yi okur, engine unit'leri 5 cihaza esler
2. Her satiri ML API `/predict`'e gonderir → anomali skoru + RUL tahmini alir
3. Sonuclari Next.js API uzerinden Supabase'e yazar (`/api/sensors` + `/api/anomalies` + `/api/devices`)
4. Zaman damgalarini son 7 gune yayar (dashboard'da gorsel veri olusur)
5. Her cihazin RUL degerine gore status gunceller (>150 active, 50-150 warning, <50 critical)
6. Tamamlandiginda tum cihazlarin guncel RUL ve status degerlerini loglar

Parametreler:

| Parametre | Varsayilan | Aciklama |
|-----------|------------|----------|
| `--units` | 5 | Kac engine unit islenir (max 100) |
| `--samples` | 50 | Unit basina ornek sayisi |
| `--delay` | 0.05 | Istekler arasi bekleme (saniye) |
| `--ml-url` | http://localhost:8000 | ML API adresi |
| `--next-url` | http://localhost:3000 | Next.js API adresi |

**Veri Temizleme (yeniden yukleme oncesi):**

```bash
curl -X DELETE http://localhost:3000/api/cleanup
```

**Canli Veri Simulatoru (opsiyonel, NASA yerine yapay veri):**

```bash
cd python
..\venv\Scripts\python simulator.py --interval 2 --cycles 100
```

Simulator her 2 saniyede bir rastgele SCADA sensor verisi uretip `/predict` endpoint'ine gonderir.
Zamanla artan degradation egrisi sayesinde RUL degerleri gercekci sekilde duser.

## Proje Yapisi

```
scada-anomaly-dashboard/
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Dashboard (tek sayfa)
│   │   │   ├── layout.tsx     # iOS-style top bar + tema toggle
│   │   │   └── page.tsx       # Ana dashboard (KPI + RUL + grafikler + tablo)
│   │   ├── api/               # Next.js API routes
│   │   │   ├── sensors/       # Sensor veri CRUD
│   │   │   ├── anomalies/     # Anomali olaylari CRUD
│   │   │   ├── devices/       # Cihaz yonetimi (GET + PATCH)
│   │   │   ├── cleanup/       # Veri temizleme (DELETE)
│   │   │   ├── script/        # Python script kontrol
│   │   │   │   ├── start-server/  # ML API baslatma (POST)
│   │   │   │   ├── start-ingest/  # Veri aktarimi baslatma (POST)
│   │   │   │   ├── stop/          # Scriptleri durdur + veri temizle (POST)
│   │   │   │   └── status/        # Script durumu sorgula (GET)
│   │   │   ├── predict/       # ML API proxy
│   │   │   ├── rul/           # RUL tahmini
│   │   │   ├── trend/         # Gunluk anomali trendi
│   │   │   └── health/        # Saglik kontrolu
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global stiller
│   ├── components/
│   │   ├── ui/                # shadcn/ui bilesenleri
│   │   ├── KPICard.tsx        # iOS-style KPI kart (backdrop-blur, variant)
│   │   ├── RULGauge.tsx       # SVG dairesel RUL gostergesi + anomali badge
│   │   ├── RealtimeSensorChart.tsx  # 14 sensor secicili canli line chart
│   │   ├── AnomalyDistribution.tsx  # Scatter plot (severity bazli)
│   │   ├── AnomalyTrend.tsx   # Stacked bar (gunluk anomali trendi, 7g/30g)
│   │   ├── AnomalyTable.tsx   # 3 sutunlu anomali tablosu (Cihaz|Uyari|Tarih)
│   │   ├── DeviceGrid.tsx     # Cihaz kartlari + anomali highlight
│   │   ├── AlertSystem.tsx    # Kalici bildirim sistemi (localStorage)
│   │   ├── SensorControl.tsx  # 3 asamali sensor kontrol butonu
│   │   ├── Onboarding.tsx     # 8 adimli etkilesimli onboarding rehberi
│   │   └── ThemeProvider.tsx  # Dark mode provider
│   ├── hooks/
│   │   ├── useRealtimeSensors.ts  # Sensor polling + Supabase realtime
│   │   └── useAlerts.ts          # Bildirim hook (fetch + realtime + localStorage)
│   └── lib/
│       ├── supabase.ts        # Client-side Supabase
│       ├── supabase-server.ts # Server-side Supabase
│       ├── database.types.ts  # Veritabani TypeScript tipleri
│       └── utils.ts           # Yardimci fonksiyonlar
├── supabase/
│   ├── migrations/            # SQL migration dosyalari (001-008)
│   │   └── 000_all_migrations.sql  # Birlesik migration (tek seferde calistir)
│   └── seed/                  # Ornek veri (devices, model_metrics)
├── python/
│   ├── models/
│   │   ├── saved/             # Egitilmis model dosyalari (.joblib, .pth)
│   │   ├── isolation_forest.py
│   │   ├── lstm_autoencoder.py
│   │   └── rul_predictor.py
│   ├── main.py                # FastAPI uygulamasi (otomatik sensor tespiti)
│   ├── data_prep.py           # Veri hazirlama pipeline
│   ├── evaluate.py            # Model degerlendirme
│   ├── explainer.py           # SHAP aciklamalar
│   ├── supabase_client.py     # Supabase kayit modulu
│   ├── simulator.py           # Canli veri simulatoru
│   ├── ingest_cmapss.py       # NASA CMAPSS → Supabase veri yukleme + status guncelleme
│   └── generate_synthetic_data.py
├── data/                      # Veri setleri (train_FD001.txt vb.)
├── requirements.txt           # Python bagimliliklari
└── .env.local.example         # Ortam degiskenleri sablonu
```

## Dashboard

Tek sayfa (`/`) uzerinde tum bilgiler iOS-style kartlarda sunulur. Tum kartlar 10 saniyede bir otomatik guncellenir.

| Bolum | Icerik |
|-------|--------|
| Genel Bakis | 6 KPI karti: Toplam Anomali, Aktif Cihaz (offline olmayan tumu), Ort. Anomali Skoru, Son 24s Alarm, Ortalama RUL, Kritik Cihaz (anomali tespit edilen cihaz sayisi) |
| Cihaz Saglik Durumu (RUL) | 5 cihaz icin SVG dairesel gauge — Saglikli (yesil) / Dikkat (sari) / Kritik (kirmizi) + anomali olan cihazlar turuncu border ve "Anomali" badge |
| Sensor Verisi | 14 CMAPSS sensoru Turkce etiketli pill butonlarla secilir. Her sensorun pill rengi = grafik cizgi rengi. Varsayilan 5 sensor secili, tikla ac/kapa |
| Anomali Dagilimi | Scatter plot — severity bazli (Kritik/Yuksek/Orta/Dusuk) |
| Anomali Trendi | Stacked bar chart — 7 gun / 30 gun toggle |
| Son Anomali Olaylari | 3 sutunlu tablo (Cihaz / Uyari + sensor / Tarih) — max 10 kayit |
| Cihazlar | Cihaz kartlari — RUL bazli durum, sensor sayisi, son gorulen, anomali olan cihazlar turuncu highlight + "Anomali tespit edildi" badge |

### Sensor Listesi (CMAPSS — 14 aktif sensor)

| Sensor | Turkce Isim |
|--------|-------------|
| sensor_2 | Fan Giris Sicakligi |
| sensor_3 | LPC Cikis Sicakligi |
| sensor_4 | HPC Cikis Sicakligi |
| sensor_7 | Toplam Sicaklik (LPT) |
| sensor_8 | Fiziksel Fan Hizi |
| sensor_9 | Fiziksel Cekirdek Hizi |
| sensor_11 | Statik Basinc (HPC) |
| sensor_12 | Yakit/Hava Orani |
| sensor_13 | Duzeltilmis Fan Hizi |
| sensor_14 | Duzeltilmis Cekirdek Hizi |
| sensor_15 | Bypass Orani |
| sensor_17 | Bleed Entalpisi |
| sensor_20 | HPT Sogutucu Bleed |
| sensor_21 | LPT Sogutucu Bleed |

> 21 CMAPSS sensorunden 7'si (sensor_1, 5, 6, 10, 16, 18, 19) sabit varyansa sahip oldugu icin filtrelenir.

## API Endpointleri

### Next.js API Routes

| Metod | Endpoint | Aciklama |
|-------|----------|----------|
| GET | `/api/sensors` | Sensor okumalarini listele (?device_id=X&limit=N) |
| POST | `/api/sensors` | Yeni sensor okumasi kaydet |
| GET | `/api/anomalies` | Anomali olaylarini listele |
| POST | `/api/anomalies` | Yeni anomali kaydi olustur |
| GET | `/api/devices` | Cihaz listesi ve durumlari |
| PATCH | `/api/devices` | Cihaz RUL/status guncelle |
| DELETE | `/api/cleanup` | sensor_readings + anomaly_events temizle |
| POST | `/api/predict` | ML API'ye anomali tahmin istegi |
| GET | `/api/rul` | Cihaz bazli RUL tahmini |
| GET | `/api/similar-anomalies` | pgvector benzer anomali arama |
| GET | `/api/health` | Servis saglik kontrolu |
| GET | `/api/heatmap` | Sensor/saat anomali isi haritasi |
| GET | `/api/trend` | Gunluk anomali trendi (severity bazli, ?days=N) |
| GET | `/api/correlation` | Sensor korelasyon matrisi |
| GET | `/api/confidence-dist` | Anomali skor dagilimi (histogram) |
| GET | `/api/shap-values` | SHAP aciklama degerleri proxy |
| GET | `/api/period-compare` | Donem karsilastirma istatistikleri |
| POST | `/api/script/start-server` | ML API sunucusunu baslat (port 8000) |
| POST | `/api/script/start-ingest` | NASA CMAPSS veri aktarimini baslat |
| POST | `/api/script/stop` | Scriptleri durdur + Supabase verilerini temizle |
| GET | `/api/script/status` | Script calisma durumunu sorgula |

### Python FastAPI

| Metod | Endpoint | Aciklama |
|-------|----------|----------|
| POST | `/predict` | Anomali skoru + RUL + SHAP |
| POST | `/batch-predict` | Toplu tahmin (CSV) |
| POST | `/retrain` | Model guncelleme |
| GET | `/model-metrics` | Model performans metrikleri |
| GET | `/shap-values` | Anomali icin detayli SHAP aciklamasi |
| GET | `/health` | Servis saglik kontrolu |

## ML Pipeline

```
Veri (CMAPSS / Sentetik SCADA)
  │
  ├── data_prep.py ──→ MinMaxScaler + 30-adim Sliding Window + Train/Test Split
  │
  ├── Anomali Tespiti (Ensemble)
  │   ├── Isolation Forest (contamination=0.05, n_estimators=100)
  │   └── LSTM Autoencoder (hidden=64, 50 epoch, reconstruction error)
  │
  ├── RUL Tahmini
  │   └── GradientBoosting (last_step + mean + std features)
  │
  ├── SHAP Aciklanabilirlik
  │   └── TreeExplainer → sensor bazinda SHAP degerleri
  │
  └── evaluate.py ──→ metrics.json (F1, AUC-ROC, RMSE)
```

### Model Detaylari

| Model | Gorev | Algoritma | Cikti |
|-------|-------|-----------|-------|
| Isolation Forest | Anomali tespiti | Unsupervised, contamination=0.05 | anomaly_score (0-1) |
| LSTM Autoencoder | Anomali tespiti | Reconstruction error > threshold | anomaly_score (0-1) |
| RUL Predictor | Kalan omur tahmini | GradientBoostingRegressor | rul_estimate + confidence |
| SHAP Explainer | Aciklanabilirlik | TreeExplainer | per-sensor SHAP degerleri |

### /predict Endpoint Akisi

```
POST /predict {device_id, sensor_data}
  │
  ├── 1. Isolation Forest → anomaly_score
  ├── 2. LSTM Autoencoder → anomaly_score (ensemble ortalama)
  ├── 3. RUL Predictor → rul_estimate + confidence
  ├── 4. SHAP Explainer → shap_values + top_feature
  │
  └── 5. Sonuc donusu (is_anomaly, score, rul_estimate, shap_values)

  Veri kaydi:
  ingest_cmapss.py → ML API /predict → Next.js API routes → Supabase
  (ML API sadece tahmin yapar, veri kaydi Next.js API uzerinden yapilir)
```

## Veritabani Semasi

```
sensor_readings
├── id (uuid PK)
├── device_id (text) ──→ devices.id
├── timestamp (timestamptz)
├── sensor_data (jsonb)         # {sensor_2: 642.15, sensor_3: 1589.7, ...}
├── embedding (vector(64))      # pgvector - benzer anomali aramasi icin
├── is_anomaly (boolean)
├── anomaly_score (float8)      # Isolation Forest / LSTM skoru
├── rul_estimate (float8)       # Kalan faydali omur tahmini (dongu)
├── shap_values (jsonb)         # SHAP aciklama degerleri
└── created_at (timestamptz)

anomaly_events
├── id (uuid PK)
├── device_id (text)
├── detected_at (timestamptz)
├── severity (text)             # low | medium | high | critical
├── sensor_values (jsonb)
├── shap_top_feature (text)     # En etkili sensor (orn: sensor_14)
├── model_version (text)
├── resolved_at (timestamptz)
└── notes (text)

model_metrics
├── id (uuid PK)
├── model_name (text)           # isolation_forest | lstm_autoencoder | rul_predictor
├── version (text)
├── trained_at (timestamptz)
├── accuracy, precision_score, recall_score, f1_score, auc_roc (float8)
├── rul_rmse (float8)
├── dataset_size (int)
└── hyperparams (jsonb)

devices
├── id (text PK)                # DEVICE-001 ... DEVICE-005
├── name (text)
├── location (text)
├── sensor_count (int)          # 14 (CMAPSS aktif sensor sayisi)
├── status (text)               # active | warning | critical | offline
├── last_seen (timestamptz)
├── current_rul (float8)        # Her /predict + PATCH ile guncellenir
└── metadata (jsonb)
```

## Veri Seti

- **NASA CMAPSS (FD001-FD004)**: Turbofan motoru bozunma simulasyonu, 21 sensor (14'u aktif, 7'si sabit varyansli filtrelenir), RUL etiketleri. `train_FD001.txt` = 20.631 satir, 100 engine unit.
- **Sentetik SCADA**: Termal santral, 10 sensor, 4 anomali tipi (spike, drift, dropout, korelasyon kirilmasi)

## Deployment

### Frontend (Vercel)

1. vercel.com → New Project → GitHub repo bagla
2. Framework: Next.js
3. Environment Variables ekle
4. Deploy

### ML API (Railway)

1. railway.app → New Project → GitHub repo bagla
2. `python/` klasorunu deploy et
3. Environment variables ekle
4. URL'yi `ML_API_URL` olarak Next.js'e ekle

## Lisans

MIT
