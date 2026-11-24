from __future__ import annotations

import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from . import engine
from .schemas import (
    CompareRequest,
    CompareResponse,
    EventsResponse,
    SimulationMetrics,
    SimulationRequest,
    SimulationResponse,
    WorkloadRequest,
    WorkloadResponse,
)

LOCAL_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


def parse_cors_origins(
    cors_origins_env: str | None = None,
    frontend_origin_env: str | None = None,
    app_env: str | None = None,
) -> list[str]:
    """
    Build an explicit CORS allowlist from environment variables.
    Rejects unrestricted '*' wildcards so production deployments remain locked down.
    """
    raw_values: list[str] = []
    if cors_origins_env:
        raw_values.extend(cors_origins_env.split(","))
    if frontend_origin_env:
        raw_values.extend(frontend_origin_env.split(","))

    origins: list[str] = []
    for item in raw_values:
        cleaned = item.strip().rstrip("/")
        if not cleaned or cleaned == "*":
            continue
        if cleaned not in origins:
            origins.append(cleaned)

    env_name = (app_env or "").strip().lower()
    if env_name != "production":
        for dev_origin in LOCAL_DEV_ORIGINS:
            if dev_origin not in origins:
                origins.append(dev_origin)

    return origins


app = FastAPI(
    title="EXAMCORE CPU Scheduling API",
    description="FastAPI wrapper around exam_cpu_sim.py for CPU Performance Evaluation in Online Examination Systems (USN 25BTRIS028).",
    version="1.0.0",
)

allowed_origins = parse_cors_origins(
    cors_origins_env=os.getenv("CORS_ORIGINS"),
    frontend_origin_env=os.getenv("FRONTEND_ORIGIN"),
    app_env=os.getenv("APP_ENV"),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "system": "EXAMCORE // 25BTRIS028",
        "default_seed": engine.exam_cpu_sim.SEED,
        "default_quantum_ms": engine.exam_cpu_sim.QUANTUM_MS,
        "task_types_ms": engine.exam_cpu_sim.TASK_TYPES,
    }


@app.post("/api/workloads", response_model=WorkloadResponse)
def create_workload(req: WorkloadRequest) -> WorkloadResponse:
    return engine.build_workload(users=req.users, seed=req.seed, persist=True)


@app.get("/api/workloads/{workload_id}", response_model=WorkloadResponse)
def get_workload(workload_id: str) -> WorkloadResponse:
    wl = engine.store.get_workload(workload_id)
    if wl is None:
        raise HTTPException(status_code=404, detail=f"Workload '{workload_id}' not found.")
    return wl["response"]


@app.post("/api/simulations", response_model=SimulationResponse)
def start_simulation(req: SimulationRequest) -> SimulationResponse:
    try:
        return engine.run_simulation(
            algorithm=req.algorithm,
            users=req.users,
            seed=req.seed,
            quantum_ms=req.quantum_ms,
            workload_id=req.workload_id,
            persist=True,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/simulations/{simulation_id}", response_model=SimulationResponse)
def get_simulation(simulation_id: str) -> SimulationResponse:
    sim = engine.store.get_simulation(simulation_id)
    if sim is None:
        raise HTTPException(status_code=404, detail=f"Simulation '{simulation_id}' not found.")
    return sim


@app.get("/api/simulations/{simulation_id}/events", response_model=EventsResponse)
def get_simulation_events(
    simulation_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=5000, ge=1, le=20000),
) -> EventsResponse:
    sim = engine.store.get_simulation(simulation_id)
    if sim is None:
        raise HTTPException(status_code=404, detail=f"Simulation '{simulation_id}' not found.")
    sliced = sim.events[offset : offset + limit]
    return EventsResponse(
        simulation_id=sim.simulation_id,
        algorithm=sim.algorithm,
        quantum_ms=sim.quantum_ms,
        total_events=len(sim.events),
        offset=offset,
        limit=limit,
        first_arrival_ms=sim.metrics.first_arrival_ms,
        completion_ms=sim.metrics.completion_ms,
        events=sliced,
    )


@app.get("/api/simulations/{simulation_id}/metrics", response_model=SimulationMetrics)
def get_simulation_metrics(simulation_id: str) -> SimulationMetrics:
    sim = engine.store.get_simulation(simulation_id)
    if sim is None:
        raise HTTPException(status_code=404, detail=f"Simulation '{simulation_id}' not found.")
    return sim.metrics


@app.post("/api/compare", response_model=CompareResponse)
def compare_post(req: CompareRequest) -> CompareResponse:
    try:
        return engine.compare_schedulers(
            users=req.users,
            seed=req.seed,
            quantum_ms=req.quantum_ms,
            workload_id=req.workload_id,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/compare", response_model=CompareResponse)
def compare_get(
    users: int = Query(default=50, ge=1, le=500),
    seed: int = Query(default=28, ge=0, le=100000),
    quantum_ms: float = Query(default=5.0, ge=0.5, le=100.0),
    workload_id: str | None = Query(default=None),
) -> CompareResponse:
    try:
        return engine.compare_schedulers(
            users=users,
            seed=seed,
            quantum_ms=quantum_ms,
            workload_id=workload_id,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/compare/export.csv")
def export_comparison_csv(
    users: int = Query(default=50, ge=1, le=500),
    seed: int = Query(default=28, ge=0, le=100000),
    quantum_ms: float = Query(default=5.0, ge=0.5, le=100.0),
) -> PlainTextResponse:
    csv_text = engine.build_comparison_csv(users=users, seed=seed, quantum_ms=quantum_ms)
    filename = f"examcore_compare_{users}users_q{quantum_ms}.csv"
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

