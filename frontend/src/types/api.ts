export type AlgorithmType = 'fcfs' | 'rr';

export type TaskKind = 'load_question' | 'save_answer' | 'submit_exam';

export interface TaskSpec {
  task_id: string;
  index: number;
  user: number;
  kind: TaskKind;
  arrival: number;
  burst: number;
}

export interface WorkloadComposition {
  load_question_count: number;
  save_answer_count: number;
  submit_exam_count: number;
  load_question_pct: number;
  save_answer_pct: number;
  submit_exam_pct: number;
}

export interface WorkloadResponse {
  workload_id: string;
  users: number;
  seed: number;
  total_tasks: number;
  mean_burst_ms: number;
  total_cpu_ms: number;
  first_arrival_ms: number;
  last_arrival_ms: number;
  composition: WorkloadComposition;
  tasks: TaskSpec[];
}

export interface ReadyQueueItem {
  task_id: string;
  user: number;
  kind: TaskKind | string;
  arrival: number;
  burst: number;
  remaining_ms: number;
}

export interface SimulationEvent {
  seq: number;
  type: 'execute' | 'idle';
  task_id: string | null;
  user: number | null;
  kind: TaskKind | string | null;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  burst_ms: number | null;
  remaining_before_ms: number | null;
  remaining_after_ms: number | null;
  preempted: boolean;
  completed: boolean;
  ready_queue_depth: number;
  ready_queue: ReadyQueueItem[];
  completed_count: number;
  recent_completed_ids: string[];
  context_switches_so_far: number;
}

export interface TaskExecutionResult {
  task_id: string;
  user: number;
  kind: TaskKind | string;
  arrival: number;
  burst: number;
  start: number;
  finish: number;
  first_response_ms: number;
  turnaround_ms: number;
  wait_ms: number;
  preemptions: number;
  slices: number;
}

export interface SimulationMetrics {
  scheduler: string;
  algorithm: AlgorithmType;
  quantum_ms: number | null;
  users: number;
  tasks: number;
  avg_turnaround_ms: number;
  avg_wait_ms: number;
  avg_first_response_ms: number;
  max_wait_ms: number;
  max_turnaround_ms: number;
  throughput_tasks_per_s: number;
  cpu_utilization_pct: number;
  estimated_peak_memory_mb: number;
  makespan_ms: number;
  first_arrival_ms: number;
  completion_ms: number;
  total_cpu_ms: number;
  total_idle_ms: number;
  total_slices: number;
  total_preemptions: number;
  context_switches: number;
}

export interface SimulationResponse {
  simulation_id: string;
  workload_id: string;
  algorithm: AlgorithmType;
  quantum_ms: number | null;
  users: number;
  seed: number;
  metrics: SimulationMetrics;
  events: SimulationEvent[];
  task_results: TaskExecutionResult[];
}

export interface ComparisonDeltas {
  wait_delta_ms: number;
  wait_reduction_pct: number;
  turnaround_delta_ms: number;
  turnaround_reduction_pct: number;
  first_response_delta_ms: number;
  first_response_reduction_pct: number;
  cpu_utilization_delta_pct: number;
  context_switch_delta: number;
}

export interface TaskComparisonRow {
  task_id: string;
  user: number;
  kind: TaskKind | string;
  arrival: number;
  burst: number;
  fcfs_wait_ms: number;
  rr_wait_ms: number;
  fcfs_turnaround_ms: number;
  rr_turnaround_ms: number;
  fcfs_first_response_ms: number;
  rr_first_response_ms: number;
  rr_preemptions: number;
  wait_delta_pct: number;
}

export interface LoadSweepPoint {
  users: number;
  tasks: number;
  fcfs_avg_wait_ms: number;
  rr_avg_wait_ms: number;
  fcfs_avg_turnaround_ms: number;
  rr_avg_turnaround_ms: number;
  fcfs_avg_first_response_ms: number;
  rr_avg_first_response_ms: number;
  fcfs_cpu_utilization_pct: number;
  rr_cpu_utilization_pct: number;
}

export interface CompareResponse {
  workload_id: string;
  users: number;
  seed: number;
  quantum_ms: number;
  fcfs: SimulationMetrics;
  rr: SimulationMetrics;
  deltas: ComparisonDeltas;
  sample_trace: TaskComparisonRow[];
  sweep: LoadSweepPoint[];
}

