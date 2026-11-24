from __future__ import annotations

import csv
import io
import sys
import uuid
from collections import OrderedDict
from pathlib import Path
from typing import Any

# Ensure root project directory is importable so we use the original exam_cpu_sim.py directly
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import exam_cpu_sim  # noqa: E402

from .schemas import (
    AlgorithmType,
    CompareResponse,
    ComparisonDeltas,
    LoadSweepPoint,
    ReadyQueueItem,
    SimulationEvent,
    SimulationMetrics,
    SimulationResponse,
    TaskComparisonRow,
    TaskExecutionResult,
    TaskSpec,
    WorkloadComposition,
    WorkloadResponse,
)

MAX_STORED_WORKLOADS = 64
MAX_STORED_SIMULATIONS = 64
READY_QUEUE_PREVIEW_LIMIT = 24
RECENT_COMPLETED_LIMIT = 16


class EngineStore:
    """In-memory bounded store for generated workloads and simulation runs."""

    def __init__(self) -> None:
        self.workloads: OrderedDict[str, dict[str, Any]] = OrderedDict()
        self.simulations: OrderedDict[str, SimulationResponse] = OrderedDict()

    def put_workload(self, workload_id: str, payload: dict[str, Any]) -> None:
        self.workloads[workload_id] = payload
        self.workloads.move_to_end(workload_id)
        while len(self.workloads) > MAX_STORED_WORKLOADS:
            self.workloads.popitem(last=False)

    def get_workload(self, workload_id: str) -> dict[str, Any] | None:
        item = self.workloads.get(workload_id)
        if item is not None:
            self.workloads.move_to_end(workload_id)
        return item

    def put_simulation(self, sim_id: str, sim: SimulationResponse) -> None:
        self.simulations[sim_id] = sim
        self.simulations.move_to_end(sim_id)
        while len(self.simulations) > MAX_STORED_SIMULATIONS:
            self.simulations.popitem(last=False)

    def get_simulation(self, sim_id: str) -> SimulationResponse | None:
        item = self.simulations.get(sim_id)
        if item is not None:
            self.simulations.move_to_end(sim_id)
        return item


store = EngineStore()


def _format_task_id(idx: int) -> str:
    return f"P{idx + 1:03d}"


def build_workload(users: int, seed: int = exam_cpu_sim.SEED, persist: bool = True) -> WorkloadResponse:
    raw_tasks = exam_cpu_sim.create_tasks(users=users, seed=seed)
    tasks: list[TaskSpec] = []
    counts = {"load_question": 0, "save_answer": 0, "submit_exam": 0}

    for idx, t in enumerate(raw_tasks):
        kind = t["kind"]
        counts[kind] = counts.get(kind, 0) + 1
        tasks.append(
            TaskSpec(
                task_id=_format_task_id(idx),
                index=idx,
                user=t["user"],
                kind=kind,
                arrival=round(t["arrival"], 6),
                burst=round(t["burst"], 6),
            )
        )

    total = len(tasks)
    total_cpu = sum(t.burst for t in tasks)
    workload_id = f"WL-{users}-{seed}-{uuid.uuid4().hex[:6].upper()}"

    composition = WorkloadComposition(
        load_question_count=counts["load_question"],
        save_answer_count=counts["save_answer"],
        submit_exam_count=counts["submit_exam"],
        load_question_pct=round(100.0 * counts["load_question"] / total, 2) if total else 0.0,
        save_answer_pct=round(100.0 * counts["save_answer"] / total, 2) if total else 0.0,
        submit_exam_pct=round(100.0 * counts["submit_exam"] / total, 2) if total else 0.0,
    )

    response = WorkloadResponse(
        workload_id=workload_id,
        users=users,
        seed=seed,
        total_tasks=total,
        mean_burst_ms=round(total_cpu / total, 4) if total else 0.0,
        total_cpu_ms=round(total_cpu, 4),
        first_arrival_ms=tasks[0].arrival if tasks else 0.0,
        last_arrival_ms=tasks[-1].arrival if tasks else 0.0,
        composition=composition,
        tasks=tasks,
    )

    if persist:
        store.put_workload(
            workload_id,
            {
                "response": response,
                "raw_tasks": raw_tasks,
            },
        )
    return response


def _snapshot_queue(queue: list[dict[str, Any]]) -> list[ReadyQueueItem]:
    items: list[ReadyQueueItem] = []
    for item in queue[:READY_QUEUE_PREVIEW_LIMIT]:
        items.append(
            ReadyQueueItem(
                task_id=item["task_id"],
                user=item["user"],
                kind=item["kind"],
                arrival=round(item["arrival"], 6),
                burst=round(item["burst"], 6),
                remaining_ms=round(item["remaining"], 6),
            )
        )
    return items


def _trace_fcfs(raw_tasks: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[SimulationEvent], list[TaskExecutionResult], int, int]:
    """
    Traces FCFS execution step-by-step while matching exam_cpu_sim.simulate_fcfs exactly.
    """
    pending = [
        {**t, "task_id": _format_task_id(idx), "index": idx, "remaining": t["burst"]}
        for idx, t in enumerate(raw_tasks)
    ]

    # Run original simulation to guarantee exact parity
    rows = exam_cpu_sim.simulate_fcfs(raw_tasks)

    now = 0.0
    events: list[SimulationEvent] = []
    completed_ids: list[str] = []
    task_results: list[TaskExecutionResult] = []
    seq = 0
    context_switches = 0
    last_task_id: str | None = None

    for idx, t in enumerate(pending):
        arrival = t["arrival"]
        if now < arrival:
            # Idle gap before this task arrives
            events.append(
                SimulationEvent(
                    seq=seq,
                    type="idle",
                    start_ms=round(now, 6),
                    end_ms=round(arrival, 6),
                    duration_ms=round(arrival - now, 6),
                    ready_queue_depth=0,
                    ready_queue=[],
                    completed_count=len(completed_ids),
                    recent_completed_ids=completed_ids[-RECENT_COMPLETED_LIMIT:],
                    context_switches_so_far=context_switches,
                )
            )
            seq += 1
            now = arrival

        start = now
        finish = start + t["burst"]

        # Tasks already arrived by `start` (excluding current task) form the ready queue at dispatch time
        ready_at_start = [p for p in pending[idx + 1 :] if p["arrival"] <= start]

        if last_task_id is not None and last_task_id != t["task_id"]:
            context_switches += 1
        last_task_id = t["task_id"]

        completed_ids.append(t["task_id"])
        events.append(
            SimulationEvent(
                seq=seq,
                type="execute",
                task_id=t["task_id"],
                user=t["user"],
                kind=t["kind"],
                start_ms=round(start, 6),
                end_ms=round(finish, 6),
                duration_ms=round(t["burst"], 6),
                burst_ms=round(t["burst"], 6),
                remaining_before_ms=round(t["burst"], 6),
                remaining_after_ms=0.0,
                preempted=False,
                completed=True,
                ready_queue_depth=len(ready_at_start),
                ready_queue=_snapshot_queue(ready_at_start),
                completed_count=len(completed_ids),
                recent_completed_ids=completed_ids[-RECENT_COMPLETED_LIMIT:],
                context_switches_so_far=context_switches,
            )
        )
        seq += 1
        now = finish

        row = rows[idx]
        task_results.append(
            TaskExecutionResult(
                task_id=t["task_id"],
                user=t["user"],
                kind=t["kind"],
                arrival=round(row["arrival"], 6),
                burst=round(row["burst"], 6),
                start=round(row["start"], 6),
                finish=round(row["finish"], 6),
                first_response_ms=round(row["start"] - row["arrival"], 6),
                turnaround_ms=round(row["response"], 6),
                wait_ms=round(row["wait"], 6),
                preemptions=0,
                slices=1,
            )
        )

    return rows, events, task_results, context_switches, 0


def _trace_round_robin(
    raw_tasks: list[dict[str, Any]], quantum: float
) -> tuple[list[dict[str, Any]], list[SimulationEvent], list[TaskExecutionResult], int, int]:
    """
    Traces Round Robin execution slice-by-slice while matching exam_cpu_sim.simulate_round_robin exactly.
    """
    pending = [
        {
            **t,
            "task_id": _format_task_id(idx),
            "index": idx,
            "remaining": t["burst"],
            "preemptions": 0,
            "slices": 0,
        }
        for idx, t in enumerate(raw_tasks)
    ]

    i = 0
    now = 0.0
    ready: list[dict[str, Any]] = []
    rows: list[dict[str, Any]] = []
    events: list[SimulationEvent] = []
    task_results: list[TaskExecutionResult] = []
    completed_ids: list[str] = []
    seq = 0
    context_switches = 0
    total_preemptions = 0
    last_task_id: str | None = None

    while i < len(pending) or ready:
        if not ready and i < len(pending) and now < pending[i]["arrival"]:
            idle_start = now
            idle_end = pending[i]["arrival"]
            events.append(
                SimulationEvent(
                    seq=seq,
                    type="idle",
                    start_ms=round(idle_start, 6),
                    end_ms=round(idle_end, 6),
                    duration_ms=round(idle_end - idle_start, 6),
                    ready_queue_depth=0,
                    ready_queue=[],
                    completed_count=len(completed_ids),
                    recent_completed_ids=completed_ids[-RECENT_COMPLETED_LIMIT:],
                    context_switches_so_far=context_switches,
                )
            )
            seq += 1
            now = idle_end

        while i < len(pending) and pending[i]["arrival"] <= now:
            ready.append(pending[i])
            i += 1
        if not ready:
            continue

        task = ready.pop(0)
        if "first_start" not in task:
            task["first_start"] = now

        if last_task_id is not None and last_task_id != task["task_id"]:
            context_switches += 1
        last_task_id = task["task_id"]

        slice_start = now
        rem_before = task["remaining"]
        run = min(quantum, task["remaining"])
        now += run
        task["remaining"] -= run
        task["slices"] += 1

        # Snapshot ready queue right at slice dispatch (before new arrivals during slice)
        ready_snapshot = _snapshot_queue(ready)
        ready_depth = len(ready)

        while i < len(pending) and pending[i]["arrival"] <= now:
            ready.append(pending[i])
            i += 1

        is_preempted = task["remaining"] > 1e-9
        is_completed = not is_preempted

        if is_preempted:
            task["preemptions"] += 1
            total_preemptions += 1
            ready.append(task)
        else:
            completed_ids.append(task["task_id"])
            row = {
                **task,
                "start": task["first_start"],
                "finish": now,
                "response": now - task["arrival"],
                "wait": now - task["arrival"] - task["burst"],
            }
            rows.append(row)
            task_results.append(
                TaskExecutionResult(
                    task_id=task["task_id"],
                    user=task["user"],
                    kind=task["kind"],
                    arrival=round(row["arrival"], 6),
                    burst=round(row["burst"], 6),
                    start=round(row["start"], 6),
                    finish=round(row["finish"], 6),
                    first_response_ms=round(row["start"] - row["arrival"], 6),
                    turnaround_ms=round(row["response"], 6),
                    wait_ms=round(row["wait"], 6),
                    preemptions=task["preemptions"],
                    slices=task["slices"],
                )
            )

        events.append(
            SimulationEvent(
                seq=seq,
                type="execute",
                task_id=task["task_id"],
                user=task["user"],
                kind=task["kind"],
                start_ms=round(slice_start, 6),
                end_ms=round(now, 6),
                duration_ms=round(run, 6),
                burst_ms=round(task["burst"], 6),
                remaining_before_ms=round(rem_before, 6),
                remaining_after_ms=round(max(0.0, task["remaining"]), 6),
                preempted=is_preempted,
                completed=is_completed,
                ready_queue_depth=ready_depth,
                ready_queue=ready_snapshot,
                completed_count=len(completed_ids),
                recent_completed_ids=completed_ids[-RECENT_COMPLETED_LIMIT:],
                context_switches_so_far=context_switches,
            )
        )
        seq += 1

    # Order task_results by task index for consistent inspection
    task_results.sort(key=lambda r: int(r.task_id[1:]))
    return rows, events, task_results, context_switches, total_preemptions


def _compute_metrics(
    rows: list[dict[str, Any]],
    events: list[SimulationEvent],
    users: int,
    algorithm: AlgorithmType,
    quantum_ms: float | None,
    context_switches: int,
    total_preemptions: int,
) -> SimulationMetrics:
    base = exam_cpu_sim.metrics(rows, users)
    first_responses = [r["start"] - r["arrival"] for r in rows]
    avg_first_response = sum(first_responses) / len(first_responses) if first_responses else 0.0
    max_wait = max((r["wait"] for r in rows), default=0.0)
    max_turnaround = max((r["response"] for r in rows), default=0.0)
    first_arrival = min((r["arrival"] for r in rows), default=0.0)
    completion = max((r["finish"] for r in rows), default=0.0)
    total_cpu = sum(r["burst"] for r in rows)
    total_idle = sum(e.duration_ms for e in events if e.type == "idle" and e.start_ms >= first_arrival)
    total_slices = sum(1 for e in events if e.type == "execute")

    scheduler_label = "FCFS" if algorithm == "fcfs" else f"Round Robin ({quantum_ms:.1f} ms quantum)"

    return SimulationMetrics(
        scheduler=scheduler_label,
        algorithm=algorithm,
        quantum_ms=quantum_ms if algorithm == "rr" else None,
        users=base["users"],
        tasks=base["tasks"],
        avg_turnaround_ms=round(base["avg_turnaround_ms"], 4),
        avg_wait_ms=round(base["avg_wait_ms"], 4),
        avg_first_response_ms=round(avg_first_response, 4),
        max_wait_ms=round(max_wait, 4),
        max_turnaround_ms=round(max_turnaround, 4),
        throughput_tasks_per_s=round(base["throughput_tasks_per_s"], 4),
        cpu_utilization_pct=round(base["cpu_utilization_pct"], 4),
        estimated_peak_memory_mb=round(base["estimated_peak_memory_mb"], 2),
        makespan_ms=round(base["makespan_ms"], 4),
        first_arrival_ms=round(first_arrival, 4),
        completion_ms=round(completion, 4),
        total_cpu_ms=round(total_cpu, 4),
        total_idle_ms=round(total_idle, 4),
        total_slices=total_slices,
        total_preemptions=total_preemptions,
        context_switches=context_switches,
    )


def run_simulation(
    algorithm: AlgorithmType,
    users: int = 50,
    seed: int = exam_cpu_sim.SEED,
    quantum_ms: float = exam_cpu_sim.QUANTUM_MS,
    workload_id: str | None = None,
    persist: bool = True,
) -> SimulationResponse:
    if workload_id is not None:
        wl = store.get_workload(workload_id)
        if wl is None:
            raise KeyError(f"Workload '{workload_id}' not found")
        raw_tasks = wl["raw_tasks"]
        wl_resp: WorkloadResponse = wl["response"]
        users = wl_resp.users
        seed = wl_resp.seed
    else:
        wl_resp = build_workload(users=users, seed=seed, persist=persist)
        workload_id = wl_resp.workload_id
        raw_tasks = exam_cpu_sim.create_tasks(users=users, seed=seed)

    if algorithm == "fcfs":
        rows, events, task_results, cs, preemptions = _trace_fcfs(raw_tasks)
        applied_quantum: float | None = None
    else:
        rows, events, task_results, cs, preemptions = _trace_round_robin(raw_tasks, quantum=quantum_ms)
        applied_quantum = quantum_ms

    metrics_obj = _compute_metrics(
        rows=rows,
        events=events,
        users=users,
        algorithm=algorithm,
        quantum_ms=applied_quantum,
        context_switches=cs,
        total_preemptions=preemptions,
    )

    sim_id = f"SIM-{algorithm.upper()}-{users}-{uuid.uuid4().hex[:6].upper()}"
    sim_resp = SimulationResponse(
        simulation_id=sim_id,
        workload_id=workload_id,
        algorithm=algorithm,
        quantum_ms=applied_quantum,
        users=users,
        seed=seed,
        metrics=metrics_obj,
        events=events,
        task_results=task_results,
    )

    if persist:
        store.put_simulation(sim_id, sim_resp)
    return sim_resp


def _pct_reduction(baseline: float, candidate: float) -> float:
    if baseline <= 1e-9:
        return 0.0
    return round(((candidate - baseline) / baseline) * 100.0, 2)


def compare_schedulers(
    users: int = 50,
    seed: int = exam_cpu_sim.SEED,
    quantum_ms: float = exam_cpu_sim.QUANTUM_MS,
    workload_id: str | None = None,
) -> CompareResponse:
    if workload_id is not None:
        wl = store.get_workload(workload_id)
        if wl is None:
            raise KeyError(f"Workload '{workload_id}' not found")
        wl_resp: WorkloadResponse = wl["response"]
        users = wl_resp.users
        seed = wl_resp.seed
        raw_tasks = wl["raw_tasks"]
    else:
        wl_resp = build_workload(users=users, seed=seed, persist=True)
        workload_id = wl_resp.workload_id
        raw_tasks = exam_cpu_sim.create_tasks(users=users, seed=seed)

    fcfs_rows, fcfs_events, fcfs_tasks, fcfs_cs, fcfs_preempt = _trace_fcfs(raw_tasks)
    rr_rows, rr_events, rr_tasks, rr_cs, rr_preempt = _trace_round_robin(raw_tasks, quantum=quantum_ms)

    fcfs_metrics = _compute_metrics(fcfs_rows, fcfs_events, users, "fcfs", None, fcfs_cs, fcfs_preempt)
    rr_metrics = _compute_metrics(rr_rows, rr_events, users, "rr", quantum_ms, rr_cs, rr_preempt)

    deltas = ComparisonDeltas(
        wait_delta_ms=round(rr_metrics.avg_wait_ms - fcfs_metrics.avg_wait_ms, 4),
        wait_reduction_pct=_pct_reduction(fcfs_metrics.avg_wait_ms, rr_metrics.avg_wait_ms),
        turnaround_delta_ms=round(rr_metrics.avg_turnaround_ms - fcfs_metrics.avg_turnaround_ms, 4),
        turnaround_reduction_pct=_pct_reduction(fcfs_metrics.avg_turnaround_ms, rr_metrics.avg_turnaround_ms),
        first_response_delta_ms=round(rr_metrics.avg_first_response_ms - fcfs_metrics.avg_first_response_ms, 4),
        first_response_reduction_pct=_pct_reduction(fcfs_metrics.avg_first_response_ms, rr_metrics.avg_first_response_ms),
        cpu_utilization_delta_pct=round(rr_metrics.cpu_utilization_pct - fcfs_metrics.cpu_utilization_pct, 4),
        context_switch_delta=rr_metrics.context_switches - fcfs_metrics.context_switches,
    )

    sample_trace: list[TaskComparisonRow] = []
    for f_task, r_task in zip(fcfs_tasks[:10], rr_tasks[:10]):
        sample_trace.append(
            TaskComparisonRow(
                task_id=f_task.task_id,
                user=f_task.user,
                kind=f_task.kind,
                arrival=f_task.arrival,
                burst=f_task.burst,
                fcfs_wait_ms=f_task.wait_ms,
                rr_wait_ms=r_task.wait_ms,
                fcfs_turnaround_ms=f_task.turnaround_ms,
                rr_turnaround_ms=r_task.turnaround_ms,
                fcfs_first_response_ms=f_task.first_response_ms,
                rr_first_response_ms=r_task.first_response_ms,
                rr_preemptions=r_task.preemptions,
                wait_delta_pct=_pct_reduction(f_task.wait_ms, r_task.wait_ms),
            )
        )

    sweep_users = [10, 25, 50, 100, 200]
    sweep: list[LoadSweepPoint] = []
    for u in sweep_users:
        s_tasks = exam_cpu_sim.create_tasks(users=u, seed=seed)
        f_rows, f_ev, _, f_cs, f_pre = _trace_fcfs(s_tasks)
        r_rows, r_ev, _, r_cs, r_pre = _trace_round_robin(s_tasks, quantum=quantum_ms)
        fm = _compute_metrics(f_rows, f_ev, u, "fcfs", None, f_cs, f_pre)
        rm = _compute_metrics(r_rows, r_ev, u, "rr", quantum_ms, r_cs, r_pre)
        sweep.append(
            LoadSweepPoint(
                users=u,
                tasks=fm.tasks,
                fcfs_avg_wait_ms=fm.avg_wait_ms,
                rr_avg_wait_ms=rm.avg_wait_ms,
                fcfs_avg_turnaround_ms=fm.avg_turnaround_ms,
                rr_avg_turnaround_ms=rm.avg_turnaround_ms,
                fcfs_avg_first_response_ms=fm.avg_first_response_ms,
                rr_avg_first_response_ms=rm.avg_first_response_ms,
                fcfs_cpu_utilization_pct=fm.cpu_utilization_pct,
                rr_cpu_utilization_pct=rm.cpu_utilization_pct,
            )
        )

    return CompareResponse(
        workload_id=workload_id,
        users=users,
        seed=seed,
        quantum_ms=quantum_ms,
        fcfs=fcfs_metrics,
        rr=rr_metrics,
        deltas=deltas,
        sample_trace=sample_trace,
        sweep=sweep,
    )


def build_comparison_csv(users: int = 50, seed: int = exam_cpu_sim.SEED, quantum_ms: float = exam_cpu_sim.QUANTUM_MS) -> str:
    raw_tasks = exam_cpu_sim.create_tasks(users=users, seed=seed)
    _, _, fcfs_tasks, _, _ = _trace_fcfs(raw_tasks)
    _, _, rr_tasks, _, _ = _trace_round_robin(raw_tasks, quantum=quantum_ms)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "task_id",
            "user",
            "kind",
            "arrival_ms",
            "burst_ms",
            "fcfs_start_ms",
            "fcfs_finish_ms",
            "fcfs_wait_ms",
            "fcfs_turnaround_ms",
            "fcfs_first_response_ms",
            "rr_start_ms",
            "rr_finish_ms",
            "rr_wait_ms",
            "rr_turnaround_ms",
            "rr_first_response_ms",
            "rr_preemptions",
            "rr_slices",
        ]
    )
    for f_t, r_t in zip(fcfs_tasks, rr_tasks):
        writer.writerow(
            [
                f_t.task_id,
                f_t.user,
                f_t.kind,
                f_t.arrival,
                f_t.burst,
                f_t.start,
                f_t.finish,
                f_t.wait_ms,
                f_t.turnaround_ms,
                f_t.first_response_ms,
                r_t.start,
                r_t.finish,
                r_t.wait_ms,
                r_t.turnaround_ms,
                r_t.first_response_ms,
                r_t.preemptions,
                r_t.slices,
            ]
        )
    return buf.getvalue()

