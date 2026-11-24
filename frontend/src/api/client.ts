import type {
  AlgorithmType,
  CompareResponse,
  SimulationMetrics,
  SimulationResponse,
  WorkloadResponse,
} from '../types/api';

const rawApiUrl = (import.meta.env.VITE_API_URL ?? '').trim();
const API_BASE = rawApiUrl.replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch (err) {
    throw new ApiError(
      0,
      err instanceof Error
        ? `Backend unreachable: ${err.message}. Verify the backend server is running and VITE_API_URL is configured.`
        : 'Backend unreachable. Verify the backend server is running and VITE_API_URL is configured.'
    );
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') {
        detail = body.detail;
      } else if (Array.isArray(body?.detail)) {
        detail = body.detail.map((d: { msg?: string }) => d.msg ?? 'Validation error').join('; ');
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new ApiError(response.status, detail);
  }

  return (await response.json()) as T;
}

export const api = {
  health: () => requestJson<{ status: string; system: string }>('/api/health'),

  createWorkload: (users: number, seed: number) =>
    requestJson<WorkloadResponse>('/api/workloads', {
      method: 'POST',
      body: JSON.stringify({ users, seed }),
    }),

  startSimulation: (params: {
    workload_id?: string | null;
    users: number;
    seed: number;
    algorithm: AlgorithmType;
    quantum_ms: number;
  }) =>
    requestJson<SimulationResponse>('/api/simulations', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getSimulationMetrics: (simulationId: string) =>
    requestJson<SimulationMetrics>(`/api/simulations/${encodeURIComponent(simulationId)}/metrics`),

  compare: (params: {
    workload_id?: string | null;
    users: number;
    seed: number;
    quantum_ms: number;
  }) =>
    requestJson<CompareResponse>('/api/compare', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getCsvExportUrl: (users: number, seed: number, quantumMs: number) =>
    `${API_BASE}/api/compare/export.csv?users=${encodeURIComponent(users)}&seed=${encodeURIComponent(seed)}&quantum_ms=${encodeURIComponent(quantumMs)}`,
};

