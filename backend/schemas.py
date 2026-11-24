from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


AlgorithmType = Literal["fcfs", "rr"]


class WorkloadRequest(BaseModel):
    users: int = Field(default=50, ge=1, le=500, description="Concurrent examinee count (1-500)")
    seed: int = Field(default=28, ge=0, le=100000, description="Deterministic RNG seed")


class TaskSpec(BaseModel):
    task_id: str
    index: int
    user: int
    kind: Literal["load_question", "save_answer", "submit_exam"]
    arrival: float
    burst: float


class WorkloadComposition(BaseModel):
    load_question_count: int
    save_answer_count: int
    submit_exam_count: int
    load_question_pct: float
    save_answer_pct: float
    submit_exam_pct: float


class WorkloadResponse(BaseModel):
    workload_id: str
    users: int
    seed: int
    total_tasks: int
    mean_burst_ms: float
    total_cpu_ms: float
    first_arrival_ms: float
    last_arrival_ms: float
    composition: WorkloadComposition
    tasks: list[TaskSpec]


class SimulationRequest(BaseModel):
    workload_id: Optional[str] = Field(default=None, description="Existing workload ID; if omitted, generates from users & seed")
    users: int = Field(default=50, ge=1, le=500)
    seed: int = Field(default=28, ge=0, le=100000)
    algorithm: AlgorithmType = Field(default="rr")
    quantum_ms: float = Field(default=5.0, ge=0.5, le=100.0)


class ReadyQueueItem(BaseModel):
    task_id: str
    user: int
    kind: str
    arrival: float
    burst: float
    remaining_ms: float


class SimulationEvent(BaseModel):
    seq: int
    type: Literal["execute", "idle"]
    task_id: Optional[str] = None
    user: Optional[int] = None
    kind: Optional[str] = None
    start_ms: float
    end_ms: float
    duration_ms: float
    burst_ms: Optional[float] = None
    remaining_before_ms: Optional[float] = None
    remaining_after_ms: Optional[float] = None
    preempted: bool = False
    completed: bool = False
    ready_queue_depth: int
    ready_queue: list[ReadyQueueItem]
    completed_count: int
    recent_completed_ids: list[str]
    context_switches_so_far: int


class TaskExecutionResult(BaseModel):
    task_id: str
    user: int
    kind: str
    arrival: float
    burst: float
    start: float
    finish: float
    first_response_ms: float
    turnaround_ms: float
    wait_ms: float
    preemptions: int
    slices: int


class SimulationMetrics(BaseModel):
    scheduler: str
    algorithm: AlgorithmType
    quantum_ms: Optional[float]
    users: int
    tasks: int
    avg_turnaround_ms: float
    avg_wait_ms: float
    avg_first_response_ms: float
    max_wait_ms: float
    max_turnaround_ms: float
    throughput_tasks_per_s: float
    cpu_utilization_pct: float
    estimated_peak_memory_mb: float
    makespan_ms: float
    first_arrival_ms: float
    completion_ms: float
    total_cpu_ms: float
    total_idle_ms: float
    total_slices: int
    total_preemptions: int
    context_switches: int


class SimulationResponse(BaseModel):
    simulation_id: str
    workload_id: str
    algorithm: AlgorithmType
    quantum_ms: Optional[float]
    users: int
    seed: int
    metrics: SimulationMetrics
    events: list[SimulationEvent]
    task_results: list[TaskExecutionResult]


class EventsResponse(BaseModel):
    simulation_id: str
    algorithm: AlgorithmType
    quantum_ms: Optional[float]
    total_events: int
    offset: int
    limit: int
    first_arrival_ms: float
    completion_ms: float
    events: list[SimulationEvent]


class CompareRequest(BaseModel):
    workload_id: Optional[str] = None
    users: int = Field(default=50, ge=1, le=500)
    seed: int = Field(default=28, ge=0, le=100000)
    quantum_ms: float = Field(default=5.0, ge=0.5, le=100.0)


class ComparisonDeltas(BaseModel):
    wait_delta_ms: float
    wait_reduction_pct: float
    turnaround_delta_ms: float
    turnaround_reduction_pct: float
    first_response_delta_ms: float
    first_response_reduction_pct: float
    cpu_utilization_delta_pct: float
    context_switch_delta: int


class TaskComparisonRow(BaseModel):
    task_id: str
    user: int
    kind: str
    arrival: float
    burst: float
    fcfs_wait_ms: float
    rr_wait_ms: float
    fcfs_turnaround_ms: float
    rr_turnaround_ms: float
    fcfs_first_response_ms: float
    rr_first_response_ms: float
    rr_preemptions: int
    wait_delta_pct: float


class LoadSweepPoint(BaseModel):
    users: int
    tasks: int
    fcfs_avg_wait_ms: float
    rr_avg_wait_ms: float
    fcfs_avg_turnaround_ms: float
    rr_avg_turnaround_ms: float
    fcfs_avg_first_response_ms: float
    rr_avg_first_response_ms: float
    fcfs_cpu_utilization_pct: float
    rr_cpu_utilization_pct: float


class CompareResponse(BaseModel):
    workload_id: str
    users: int
    seed: int
    quantum_ms: float
    fcfs: SimulationMetrics
    rr: SimulationMetrics
    deltas: ComparisonDeltas
    sample_trace: list[TaskComparisonRow]
    sweep: list[LoadSweepPoint]

