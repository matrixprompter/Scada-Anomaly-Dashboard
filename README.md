# SCADA Anomaly Dashboard

Real-time SCADA anomaly detection dashboard powered by ensemble ML models (Isolation Forest + LSTM Autoencoder), RUL prediction, SHAP explainability, and pgvector similarity search.

Built with **Next.js 16**, **React 19**, **FastAPI**, **Supabase**, and **PyTorch**.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [ML Pipeline](#ml-pipeline)
- [API Reference](#api-reference)
- [Components](#components)
- [Dataset](#dataset)
- [License](#license)

---

## Features

### Real-time Monitoring
- Live sensor data visualization with 60-point rolling history
- Supabase realtime WebSocket subscriptions with 10s polling fallback
- KPI cards: Total Anomalies, Active Devices, Avg Anomaly Score, 24h Alarms, Avg RUL, Critical Devices

### Anomaly Detection (Ensemble)
- **Isolation Forest** - Outlier detection in flattened feature space (sklearn)
- **LSTM Autoencoder** - Sequence-based reconstruction anomaly detection (PyTorch)
- **Ensemble Logic** - If either model flags anomaly -> positive (conservative approach), scores averaged

### RUL (Remaining Useful Life) Prediction
- **Gradient Boosting Regressor** with feature engineering (last timestep + window mean/std)
- SVG circular gauge per device (0-300 cycle scale)
- Color-coded status: Green (healthy >150), Yellow (caution 50-150), Red (critical <50)
- Confidence metric based on median deviation (0.5-0.95 range)

### SHAP Explainability
- TreeExplainer on Isolation Forest model
- Per-feature SHAP values aggregated across time steps
- Top 10 feature importance horizontal bar chart (red=anomaly contributing, blue=normal)

### pgvector Similarity Search
- 64-dimensional vector embeddings stored in `sensor_readings.embedding`
- `match_similar_anomalies()` RPC with cosine distance
- Finds top K similar historical anomalies with similarity percentage

### Alerts & Notifications
- Real-time severity-coded alerts (critical/high/medium/low)
- Browser notifications for critical and high severity events
- Bell icon with unread count badge, mark-all-read, localStorage persistence

### Additional Visualizations
- **Anomaly Trend** - Stacked bar chart (daily counts by severity), 7/30 day toggle with trend %
- **Anomaly Distribution** - Scatter plot by severity and time
- **Correlation Matrix** - Pearson correlation heatmap between sensors
- **Sensor Heatmap** - Sensor x Hour anomaly frequency matrix
- **Period Comparison** - Side-by-side metric comparison of two periods
- **Confidence Histogram** - RUL confidence distribution
- **Model Metrics** - Accuracy, Precision, Recall, F1, AUC-ROC, RUL RMSE

### UX
- Dark/Light theme toggle (next-themes)
- 8-step onboarding guided tour with floating tooltips
- Sensor Control Panel: 3-phase startup (Start ML API -> Wait ready -> Start data ingestion)
- Responsive sidebar with mobile sheet drawer

---

## Architecture

```
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
|   Next.js 16     | <---> |   FastAPI ML     | <---> |   Supabase       |
|   Frontend +     |       |   Backend        |       |   PostgreSQL     |
|   API Routes     |       |   (port 8000)    |       |   + pgvector     |
|                  |       |                  |       |   + Realtime     |
+------------------+       +------------------+       +------------------+
        |                          |
   React 19 UI              ML Models:
   Chart.js + D3            - Isolation Forest
   shadcn/ui                - LSTM Autoencoder
   Tailwind CSS 4           - RUL Predictor
   Realtime Hooks           - SHAP Explainer
```

**Data Flow:**
1. NASA CMAPSS data or synthetic sensor data is ingested via `ingest_cmapss.py`
2. Each sample is sent to FastAPI `/predict` endpoint
3. ML ensemble scores the sample (anomaly detection + RUL + SHAP)
4. Results are stored in Supabase (sensor_readings + anomaly_events)
5. Next.js dashboard displays real-time data via Supabase realtime subscriptions

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.3 | Full-stack React framework |
| React | 19.2.4 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first CSS |
| Chart.js | 4.5.1 | Charts and visualizations |
| D3.js | 7.9.0 | Advanced data visualization |
| shadcn/ui | 4.2.0 | UI component library (base-nova) |
| Lucide React | 1.7.0 | Icon library |
| next-themes | 0.4.6 | Dark/light theme support |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.115.12 | Python ML API |
| Uvicorn | 0.34.2 | ASGI server |
| PyTorch | 2.6.0 | LSTM Autoencoder |
| scikit-learn | 1.6.1 | Isolation Forest, Gradient Boosting |
| SHAP | 0.45+ | Model explainability |
| Pandas | 2.2.3 | Data manipulation |
| NumPy | 2.2.4 | Numerical computing |

### Database
| Technology | Purpose |
|---|---|
| Supabase PostgreSQL | Primary database with realtime |
| pgvector | Vector similarity search |
| Row Level Security | Access control policies |

---

## Project Structure

```
scada-anomaly-dashboard/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Dashboard layout (header + sidebar)
│   │   │   └── page.tsx            # Main dashboard page
│   │   ├── api/
│   │   │   ├── anomalies/          # CRUD anomaly events
│   │   │   ├── sensors/            # Sensor readings
│   │   │   ├── devices/            # Device management
│   │   │   ├── predict/            # ML prediction proxy
│   │   │   ├── rul/                # RUL queries
│   │   │   ├── shap-values/        # SHAP explainability
│   │   │   ├── similar-anomalies/  # pgvector similarity
│   │   │   ├── trend/              # Anomaly trend data
│   │   │   ├── heatmap/            # Sensor x Hour matrix
│   │   │   ├── correlation/        # Sensor correlation matrix
│   │   │   ├── confidence-dist/    # RUL confidence distribution
│   │   │   ├── period-compare/     # Period comparison
│   │   │   ├── health/             # Health check
│   │   │   ├── cleanup/            # Data cleanup
│   │   │   └── script/             # Process control (start/stop ML API)
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css             # Global styles (Tailwind)
│   ├── components/
│   │   ├── AlertSystem.tsx         # Real-time alert notifications
│   │   ├── AnomalyDistribution.tsx # Scatter plot by severity
│   │   ├── AnomalyTable.tsx        # Recent anomalies table
│   │   ├── AnomalyTrend.tsx        # Daily anomaly trend chart
│   │   ├── ConfidenceHistogram.tsx  # RUL confidence distribution
│   │   ├── CorrelationMatrix.tsx    # Sensor correlation heatmap
│   │   ├── DeviceGrid.tsx          # Device status cards
│   │   ├── KPICard.tsx             # Metric display cards
│   │   ├── ModelMetrics.tsx        # ML model performance
│   │   ├── Onboarding.tsx          # 8-step guided tour
│   │   ├── PeriodComparison.tsx    # Period comparison view
│   │   ├── RULGauge.tsx            # SVG circular RUL gauge
│   │   ├── RealtimeSensorChart.tsx  # Live sensor line chart
│   │   ├── SHAPExplainer.tsx       # SHAP feature importance
│   │   ├── SensorControl.tsx       # ML API control panel
│   │   ├── SensorHeatmap.tsx       # Anomaly frequency heatmap
│   │   ├── SimilarAnomalies.tsx    # Similar anomaly search
│   │   ├── ThemeProvider.tsx       # Theme wrapper
│   │   └── ui/                     # shadcn/ui components
│   ├── hooks/
│   │   ├── useAlerts.ts            # Alert subscription hook
│   │   └── useRealtimeSensors.ts   # Sensor realtime hook
│   └── lib/
│       ├── supabase.ts             # Client-side Supabase
│       ├── supabase-server.ts      # Server-side Supabase (service role)
│       ├── database.types.ts       # TypeScript DB types
│       └── chartjs-setup.ts        # Chart.js configuration
├── python/
│   ├── main.py                     # FastAPI server
│   ├── models/
│   │   ├── isolation_forest.py     # Isolation Forest model
│   │   ├── lstm_autoencoder.py     # LSTM Autoencoder model
│   │   └── rul_predictor.py        # RUL Gradient Boosting
│   ├── explainer.py                # SHAP TreeExplainer
│   ├── data_prep.py                # Data preprocessing & windowing
│   ├── simulator.py                # Synthetic SCADA data generator
│   ├── ingest_cmapss.py            # NASA CMAPSS data ingestion
│   ├── evaluate.py                 # Model evaluation metrics
│   └── supabase_client.py          # Python Supabase client
├── supabase/
│   ├── migrations/                 # 8 SQL migration files
│   │   ├── 001_pgvector_extension.sql
│   │   ├── 002_sensor_readings.sql
│   │   ├── 003_anomaly_events.sql
│   │   ├── 004_model_metrics.sql
│   │   ├── 005_devices.sql
│   │   ├── 006_rls_policies.sql
│   │   ├── 007_pgvector_index.sql
│   │   └── 008_similarity_search_function.sql
│   └── seed/                       # Initial seed data
├── data/                           # NASA CMAPSS dataset
├── requirements.txt                # Python dependencies
├── package.json                    # Node.js dependencies
└── LICENSE                         # MIT License
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **Python** 3.10+
- **Supabase** account with project created
- **NASA CMAPSS** dataset (see [Dataset](#dataset))

### 1. Clone the Repository

```bash
git clone https://github.com/matrixprompter/Scada-Anomaly-Dashboard.git
cd Scada-Anomaly-Dashboard
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment Variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ML API
ML_API_URL=http://localhost:8000
```

### 5. Run Database Migrations

Execute the SQL files in `supabase/migrations/` in order (001-008) in the Supabase SQL Editor, or use the migration runner:

```bash
python supabase/run-migrations-api.py
```

### 6. Seed Initial Data

Run the seed files in `supabase/seed/`:

```sql
-- 001_seed_devices.sql (5 SCADA devices)
-- 002_seed_model_metrics.sql (model performance baselines)
```

### 7. Start the Application

```bash
# Terminal 1: Next.js development server
npm run dev

# Terminal 2: FastAPI ML server (optional - can also start from dashboard)
cd python
uvicorn main:app --reload --port 8000
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

Alternatively, use the **Sensor Control Panel** in the dashboard sidebar to start the ML API and data ingestion directly from the UI.

---

## Database Setup

### Tables

| Table | Description |
|---|---|
| `sensor_readings` | Raw sensor data with embeddings, anomaly scores, RUL estimates, SHAP values |
| `anomaly_events` | Detected anomaly events with severity, top SHAP feature, resolution status |
| `model_metrics` | ML model performance tracking (accuracy, F1, AUC, RUL RMSE) |
| `devices` | SCADA device registry with current RUL, status, location |

### pgvector

The `sensor_readings` table includes a `vector(64)` column for embeddings. The `match_similar_anomalies()` function uses cosine distance (`<=>` operator) to find similar historical anomalies.

### Row Level Security

All tables have RLS enabled:
- **SELECT**: Allowed for `anon` and `authenticated` roles
- **INSERT/UPDATE/DELETE**: Allowed for `authenticated` role only

---

## ML Pipeline

### Models

| Model | Type | Library | Purpose |
|---|---|---|---|
| Isolation Forest | Unsupervised | scikit-learn | Outlier detection (contamination=0.05) |
| LSTM Autoencoder | Deep Learning | PyTorch | Sequence reconstruction anomaly detection |
| RUL Predictor | Supervised | scikit-learn | Remaining Useful Life estimation |

### Ensemble Strategy

```
Sample -> [Isolation Forest] -> score_if, is_anomaly_if
       -> [LSTM Autoencoder] -> score_lstm, is_anomaly_lstm

Final: is_anomaly = is_anomaly_if OR is_anomaly_lstm  (conservative)
       score = (score_if + score_lstm) / 2             (averaged)
```

### Data Preprocessing

1. **Sensor filtering**: Remove constant/low-variance sensors (std <= 0.01)
2. **Normalization**: MinMaxScaler (fit on training data)
3. **Windowing**: Sliding window of 30 timesteps (WINDOW_SIZE=30)
4. **RUL labels**: `max_cycle - current_cycle` per engine unit

### SHAP Explainability

- Uses `TreeExplainer` on the Isolation Forest model
- Aggregates SHAP values by sensor name (sums absolute contributions across time steps)
- Feature naming: `sensor_name_t-{step}` (e.g., `temperature_inlet_t-29`)
- Returns top contributing feature for each prediction

### FastAPI Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/predict` | POST | Single sample prediction (anomaly + RUL + SHAP) |
| `/batch-predict` | POST | Bulk CSV prediction |
| `/retrain` | POST | Retrain all models |
| `/model-metrics` | GET | Current model performance |
| `/shap-values` | GET | SHAP explanation (demo sample) |
| `/health` | GET | Service health check |

---

## API Reference

### Next.js API Routes

| Route | Method | Description |
|---|---|---|
| `/api/anomalies` | GET | Fetch anomaly events (filter by severity, date range) |
| `/api/anomalies` | POST | Create new anomaly event |
| `/api/sensors` | GET | Fetch sensor readings (filter by device_id) |
| `/api/sensors` | POST | Insert new sensor reading |
| `/api/devices` | GET | List all devices |
| `/api/devices` | PATCH | Update device RUL/status |
| `/api/predict` | POST | Proxy to ML API `/predict` |
| `/api/rul` | GET | Get RUL for specific device |
| `/api/shap-values` | GET | Get SHAP values from ML API |
| `/api/similar-anomalies` | GET | pgvector cosine similarity search |
| `/api/trend` | GET | Daily anomaly trend (grouped by severity) |
| `/api/heatmap` | GET | Sensor x Hour anomaly frequency matrix |
| `/api/correlation` | GET | Pearson correlation matrix (500 recent readings) |
| `/api/confidence-dist` | GET | RUL confidence distribution |
| `/api/period-compare` | GET | Period comparison metrics |
| `/api/health` | GET | Health check |
| `/api/script/start-server` | POST | Start FastAPI ML server |
| `/api/script/start-ingest` | POST | Start CMAPSS data ingestion |
| `/api/script/stop` | POST | Stop all ML processes |
| `/api/script/status` | GET | Check ML server/ingest status |

---

## Components

| Component | Description |
|---|---|
| `KPICard` | Metric display cards with icons, values, and change indicators |
| `RULGauge` | SVG circular gauge showing Remaining Useful Life (0-300 scale) |
| `RealtimeSensorChart` | Live line chart with 60-point rolling history, selectable sensors |
| `AnomalyDistribution` | Scatter plot of anomalies by severity and time |
| `AnomalyTrend` | Stacked bar chart of daily anomaly counts (7/30 day toggle) |
| `AnomalyTable` | Tabular view of recent anomalies with severity badges |
| `DeviceGrid` | Card grid showing device status, RUL, and anomaly indicators |
| `SHAPExplainer` | Horizontal bar chart of top 10 SHAP feature importances |
| `SimilarAnomalies` | pgvector similarity search results with similarity % |
| `AlertSystem` | Real-time alert bell with dropdown and browser notifications |
| `SensorControl` | 3-phase ML API control panel (Start -> Ingest -> Stop) |
| `Onboarding` | 8-step guided tour with floating tooltips |
| `CorrelationMatrix` | Pearson correlation heatmap between sensors |
| `SensorHeatmap` | Sensor x Hour anomaly frequency heatmap |
| `ConfidenceHistogram` | RUL confidence score distribution |
| `PeriodComparison` | Side-by-side metric comparison of two time periods |
| `ModelMetrics` | ML model performance display (Accuracy, F1, AUC, RMSE) |

---

## Dataset

This project uses the **NASA CMAPSS (Commercial Modular Aero-Propulsion System Simulation)** Turbofan Engine Degradation dataset.

- **Source**: NASA Prognostics Center of Excellence
- **Dataset**: FD001 (single operating condition, single fault mode)
- **Training data**: 100 engine units with run-to-failure sensor recordings
- **Sensors**: 21 sensor measurements per timestep
- **Operational settings**: 3 settings per timestep

The dataset is located in `data/6. Turbofan Engine Degradation Simulation Data Set/`. Download instructions are in `data/NASA_CMAPSS_INDIR.md`.

The CMAPSS sensor data is mapped to SCADA-style sensor names during ingestion:
`temperature_inlet`, `pressure_main`, `vibration_turbine`, `flow_rate`, `humidity`, `voltage_supply`, `current_load`, `rpm_motor`, `temperature_bearing`, `pressure_hydraulic`

---

## License

This project is licensed under the [MIT License](LICENSE).
