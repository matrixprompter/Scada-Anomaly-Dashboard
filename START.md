1. pencere — ML API:
  cd python
  ..\venv\Scripts\python -m uvicorn main:app --host 0.0.0.0    
  --port 8000

  2. pencere — Next.js (zaten çalışıyorsa dokunma, yoksa       
  scada-anomaly-dashboard klasöründe):
  npm run dev

  3. pencere — Ingestion (python klasöründe):
  cd python
  ..\venv\Scripts\python ingest_cmapss.py --units 5 --samples 50

  3 CMD penceresi lazım: ML API (8000), Next.js (3000),        
  Ingestion.