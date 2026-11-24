# EXAMCORE — CPU Performance Evaluation for Online Examination Systems

**USN:** `25BTRIS028`  
**Subject:** Computer Organization & Architecture  

A full-stack discrete-event CPU scheduling simulator and comparative evaluator built with **FastAPI (Python)** and **React + Vite + TypeScript + CSS**, wrapping the original simulation model in [`exam_cpu_sim.py`](exam_cpu_sim.py) without altering its core logic.

---

## Project Structure

```text
c:\COAL\
├── exam_cpu_sim.py                 # Original Python discrete-event CPU scheduling simulation (preserved unmodified)
├── netlify.toml                    # Netlify build config & SPA fallback redirects
├── .gitignore                      # Excludes node_modules, dist, __pycache__, .env, and generated CSVs
├── backend/
│   ├── __init__.py
│   ├── .env.example                # Backend environment variable template
│   ├── engine.py                   # Event-tracing wrapper & parity layer around exam_cpu_sim.py
│   ├── main.py                     # FastAPI server, CORS allowlist & REST endpoints
│   ├── schemas.py                  # Pydantic request/response schemas & validation
│   ├── requirements.txt            # Python dependencies for local & Render deployment
│   └── tests/
│       └── test_api.py             # Pytest suite verifying parity, Gantt slices, CORS & validation
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── .env.example                # Frontend VITE_API_URL template
│   ├── public/
│   │   └── _redirects              # Netlify SPA fallback (/* /index.html 200)
│   ├── vite.config.ts              # Proxies /api to http://127.0.0.1:8000 in local dev
│   └── src/
│       ├── api/client.ts           # Typed API client reading import.meta.env.VITE_API_URL
│       ├── components/Layout.tsx   # Shared ivory/black/lime navigation shell
│       ├── context/SimulationContext.tsx
│       ├── pages/
│       │   ├── OverviewPage.tsx    # Plain-English experiment intro & pipeline overview
│       │   ├── SimulatorPage.tsx   # Guided 4-step CPU experiment, live status & Gantt timeline
│       │   ├── ResultsPage.tsx     # Plain-English metrics, FCFS vs RR chart & technical details
│       │   └── AboutPage.tsx       # Problem, approach, objective & simulation scope note
│       ├── styles/
│       │   ├── tokens.css          # DESIGN.md color, typography & spacing tokens
│       │   ├── global.css
│       │   └── pages.css
│       └── types/api.ts
├── stitch_examcore_cpu_performance_simulator/   # Original Google Stitch exports & DESIGN.md
└── README.md
```

---

## Windows Local Setup & Run Instructions

### Prerequisites
- **Python 3.10+** (`python --version`)
- **Node.js 20+** and **npm** (`node --version`, `npm --version`)

### 1. Install & Run the Backend (FastAPI)

Open PowerShell in `c:\COAL`:

```powershell
# Optional: create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend\requirements.txt

# Start the FastAPI backend on port 8000 (from repo root)
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify the backend health endpoint in PowerShell:
```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

### 2. Install & Run the Frontend (React + Vite)

Open a **second** PowerShell terminal in `c:\COAL\frontend`:

```powershell
cd frontend
npm install
npm run dev
```

For local development, leave `VITE_API_URL` unset (or empty in `frontend/.env`), so Vite's dev proxy forwards `/api/*` directly to `http://127.0.0.1:8000`.

Open in your browser:
- **Frontend UI:** `http://localhost:5173`
- **FastAPI Docs (Swagger):** `http://127.0.0.1:8000/docs`

---

## Running Tests & Verification

### Backend Tests (`pytest`)
From `c:\COAL`:
```powershell
python -m pytest backend\tests\test_api.py -v
```
This verifies:
- Exact numerical parity with `exam_cpu_sim.simulate_fcfs`, `simulate_round_robin`, and `metrics` across `10, 25, 50, 100, 200` users.
- Chronological Gantt slice contiguity and conservation (`sum(slice durations) == task burst`).
- CORS environment variable parsing (`FRONTEND_ORIGIN`, `CORS_ORIGINS`, rejecting `*` in production).
- Input validation (`422`) and missing-resource error handling (`404`).
- CSV export output.

### Frontend Production Build Check
From `c:\COAL\frontend`:
```powershell
npm run build
```

---

## Public Deployment Guide (GitHub → Render + Netlify)

### Step 1: Push Source Code to GitHub
From `c:\COAL`:
```powershell
git init
git status
git add .
git commit -m "Prepare EXAMCORE for Render and Netlify deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Step 2: Deploy Backend to Render (Web Service)
1. In Render, click **New + → Web Service** and connect your GitHub repository.
2. Configure the service settings:
   - **Runtime:** `Python 3`
   - **Root Directory:** *(leave blank — repository root)*
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
3. Set temporary environment variables on Render:
   - `APP_ENV` = `production`
   - `FRONTEND_ORIGIN` = `https://placeholder.netlify.app` *(update immediately after Step 3 with your actual Netlify URL)*
4. Deploy and copy your live Render backend URL (e.g., `https://examcore-api.onrender.com`). Verify `https://examcore-api.onrender.com/api/health` returns `{"status":"ok",...}`.

### Step 3: Deploy Frontend to Netlify
1. In Netlify, click **Add new site → Import an existing project** and select your GitHub repository.
2. [`netlify.toml`](netlify.toml) pre-configures the build settings, or verify them in **Build & deploy**:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist` (or `frontend/dist` if base directory is unset)
3. Under **Environment variables**, add:
   - `VITE_API_URL` = `https://examcore-api.onrender.com` *(your exact Render URL with no trailing slash)*
4. Deploy the site and copy your live Netlify URL (e.g., `https://examcore-25btris028.netlify.app`).
5. **Final Step — Update Render CORS:** Return to Render → **Environment**, set `FRONTEND_ORIGIN` to your exact Netlify URL (`https://examcore-25btris028.netlify.app`), and trigger a manual redeploy/restart on Render so CORS allows your Netlify site.

---

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service status and default simulation constants |
| `POST` | `/api/workloads` | Generate a deterministic exam workload (`users`, `seed`) |
| `GET` | `/api/workloads/{workload_id}` | Retrieve a previously generated workload |
| `POST` | `/api/simulations` | Run FCFS or Round Robin and return events, task rows, and metrics |
| `GET` | `/api/simulations/{simulation_id}/events` | Retrieve chronological execution slices and ready-queue snapshots |
| `GET` | `/api/simulations/{simulation_id}/metrics` | Retrieve calculated waiting, turnaround, first response, and CPU metrics |
| `POST` / `GET` | `/api/compare` | Run FCFS and Round Robin on identical workloads + 10–200 user sweep |
| `GET` | `/api/compare/export.csv` | Download per-task FCFS vs Round Robin comparison log as CSV |
