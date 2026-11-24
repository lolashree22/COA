from __future__ import annotations

import math
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import exam_cpu_sim  # noqa: E402
from backend.main import app, parse_cors_origins  # noqa: E402

client = TestClient(app)


def test_parity_with_original_exam_cpu_sim() -> None:
    """Verify backend engine produces identical metrics and task timings to exam_cpu_sim.py."""
    for users in [10, 25, 50, 100, 200]:
        raw_tasks = exam_cpu_sim.create_tasks(users)
        orig_fcfs_rows = exam_cpu_sim.simulate_fcfs(raw_tasks)
        orig_fcfs_metrics = exam_cpu_sim.metrics(orig_fcfs_rows, users)

        orig_rr_rows = exam_cpu_sim.simulate_round_robin(raw_tasks, quantum=5.0)
        orig_rr_metrics = exam_cpu_sim.metrics(orig_rr_rows, users)

        res = client.post("/api/compare", json={"users": users, "seed": 28, "quantum_ms": 5.0})
        assert res.status_code == 200
        data = res.json()

        assert math.isclose(data["fcfs"]["avg_wait_ms"], orig_fcfs_metrics["avg_wait_ms"], abs_tol=1e-3)
        assert math.isclose(data["fcfs"]["avg_turnaround_ms"], orig_fcfs_metrics["avg_turnaround_ms"], abs_tol=1e-3)
        assert math.isclose(data["fcfs"]["cpu_utilization_pct"], orig_fcfs_metrics["cpu_utilization_pct"], abs_tol=1e-3)
        assert math.isclose(data["fcfs"]["makespan_ms"], orig_fcfs_metrics["makespan_ms"], abs_tol=1e-3)

        assert math.isclose(data["rr"]["avg_wait_ms"], orig_rr_metrics["avg_wait_ms"], abs_tol=1e-3)
        assert math.isclose(data["rr"]["avg_turnaround_ms"], orig_rr_metrics["avg_turnaround_ms"], abs_tol=1e-3)
        assert math.isclose(data["rr"]["cpu_utilization_pct"], orig_rr_metrics["cpu_utilization_pct"], abs_tol=1e-3)
        assert math.isclose(data["rr"]["makespan_ms"], orig_rr_metrics["makespan_ms"], abs_tol=1e-3)


def test_gantt_events_match_task_bursts_and_metrics() -> None:
    """Verify every execute slice sums cleanly to task burst and timeline is contiguous."""
    for algo in ["fcfs", "rr"]:
        sim_res = client.post(
            "/api/simulations",
            json={"users": 25, "seed": 28, "algorithm": algo, "quantum_ms": 4.0},
        )
        assert sim_res.status_code == 200
        sim = sim_res.json()
        sim_id = sim["simulation_id"]

        events_res = client.get(f"/api/simulations/{sim_id}/events")
        assert events_res.status_code == 200
        events_payload = events_res.json()
        events = events_payload["events"]
        assert len(events) > 0

        metrics_res = client.get(f"/api/simulations/{sim_id}/metrics")
        assert metrics_res.status_code == 200
        assert metrics_res.json()["avg_wait_ms"] == sim["metrics"]["avg_wait_ms"]

        # Check contiguous timeline and slice sums
        prev_end = 0.0
        burst_by_task: dict[str, float] = {}
        for ev in events:
            assert math.isclose(ev["start_ms"], prev_end, abs_tol=1e-4)
            assert math.isclose(ev["end_ms"] - ev["start_ms"], ev["duration_ms"], abs_tol=1e-4)
            assert ev["duration_ms"] >= 0.0
            prev_end = ev["end_ms"]
            if ev["type"] == "execute":
                tid = ev["task_id"]
                burst_by_task[tid] = burst_by_task.get(tid, 0.0) + ev["duration_ms"]

        for tr in sim["task_results"]:
            assert math.isclose(burst_by_task[tr["task_id"]], tr["burst"], abs_tol=1e-3)
            assert math.isclose(tr["first_response_ms"], tr["start"] - tr["arrival"], abs_tol=1e-4)
            assert math.isclose(tr["turnaround_ms"], tr["finish"] - tr["arrival"], abs_tol=1e-4)

        total_exec = sum(ev["duration_ms"] for ev in events if ev["type"] == "execute")
        assert math.isclose(total_exec, sim["metrics"]["total_cpu_ms"], abs_tol=1e-2)


def test_workload_generation_and_validation_errors() -> None:
    wl_res = client.post("/api/workloads", json={"users": 10, "seed": 28})
    assert wl_res.status_code == 200
    wl = wl_res.json()
    assert wl["total_tasks"] == 50
    assert wl["composition"]["load_question_count"] == 10
    assert wl["composition"]["save_answer_count"] == 30
    assert wl["composition"]["submit_exam_count"] == 10

    # Invalid inputs return 422
    assert client.post("/api/workloads", json={"users": 0, "seed": 28}).status_code == 422
    assert client.post("/api/workloads", json={"users": 999, "seed": 28}).status_code == 422
    assert client.post("/api/simulations", json={"users": 10, "algorithm": "sjf"}).status_code == 422
    assert client.post("/api/simulations", json={"users": 10, "algorithm": "rr", "quantum_ms": 0.1}).status_code == 422

    # Missing resources return 404
    assert client.get("/api/workloads/WL-MISSING").status_code == 404
    assert client.get("/api/simulations/SIM-MISSING/events").status_code == 404
    assert client.get("/api/simulations/SIM-MISSING/metrics").status_code == 404


def test_csv_export_endpoint() -> None:
    res = client.get("/api/compare/export.csv?users=10&seed=28&quantum_ms=5.0")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    lines = res.text.strip().splitlines()
    # 1 header + 50 tasks
    assert len(lines) == 51
    assert lines[0].startswith("task_id,user,kind,arrival_ms")


def test_cors_origin_parsing_and_health() -> None:
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    # Production rejects '*' and excludes localhost unless explicitly listed
    prod_origins = parse_cors_origins(
        cors_origins_env="*, https://examcore.netlify.app/",
        frontend_origin_env="https://custom.examcore.dev/",
        app_env="production",
    )
    assert prod_origins == ["https://examcore.netlify.app", "https://custom.examcore.dev"]
    assert "*" not in prod_origins

    # Local development includes localhost origins
    dev_origins = parse_cors_origins(
        cors_origins_env=None,
        frontend_origin_env=None,
        app_env="development",
    )
    assert "http://localhost:5173" in dev_origins

