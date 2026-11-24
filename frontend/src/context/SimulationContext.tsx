import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type {
  AlgorithmType,
  CompareResponse,
  SimulationResponse,
  WorkloadResponse,
} from '../types/api';

interface SimulationContextValue {
  users: number;
  seed: number;
  algorithm: AlgorithmType;
  quantumMs: number;
  workload: WorkloadResponse | null;
  simulation: SimulationResponse | null;
  comparison: CompareResponse | null;
  isLoading: boolean;
  error: string | null;
  backendConnected: boolean;
  setUsers: (users: number) => void;
  setSeed: (seed: number) => void;
  setAlgorithm: (algo: AlgorithmType) => void;
  setQuantumMs: (quantum: number) => void;
  clearError: () => void;
  generateWorkload: (overrideUsers?: number, overrideSeed?: number) => Promise<WorkloadResponse | null>;
  runSimulation: (overrides?: {
    users?: number;
    seed?: number;
    algorithm?: AlgorithmType;
    quantumMs?: number;
    workloadId?: string | null;
  }) => Promise<SimulationResponse | null>;
  loadComparison: (overrides?: {
    users?: number;
    seed?: number;
    quantumMs?: number;
    workloadId?: string | null;
  }) => Promise<CompareResponse | null>;
}

const SimulationContext = createContext<SimulationContextValue | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<number>(50);
  const [seed, setSeed] = useState<number>(28);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('rr');
  const [quantumMs, setQuantumMs] = useState<number>(5.0);

  const [workload, setWorkload] = useState<WorkloadResponse | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);

  const clearError = useCallback(() => setError(null), []);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      setError(err.detail);
      if (err.status === 0) setBackendConnected(false);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('Unexpected error communicating with simulation engine.');
    }
  }, []);

  const generateWorkload = useCallback(
    async (overrideUsers?: number, overrideSeed?: number): Promise<WorkloadResponse | null> => {
      const targetUsers = overrideUsers ?? users;
      const targetSeed = overrideSeed ?? seed;
      setIsLoading(true);
      setError(null);
      try {
        const wl = await api.createWorkload(targetUsers, targetSeed);
        setWorkload(wl);
        setBackendConnected(true);
        return wl;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [users, seed, handleError]
  );

  const loadComparison = useCallback(
    async (overrides?: {
      users?: number;
      seed?: number;
      quantumMs?: number;
      workloadId?: string | null;
    }): Promise<CompareResponse | null> => {
      const targetUsers = overrides?.users ?? users;
      const targetSeed = overrides?.seed ?? seed;
      const targetQuantum = overrides?.quantumMs ?? quantumMs;
      setIsLoading(true);
      setError(null);
      try {
        const cmp = await api.compare({
          workload_id: overrides?.workloadId ?? null,
          users: targetUsers,
          seed: targetSeed,
          quantum_ms: targetQuantum,
        });
        setComparison(cmp);
        setBackendConnected(true);
        return cmp;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [users, seed, quantumMs, handleError]
  );

  const runSimulation = useCallback(
    async (overrides?: {
      users?: number;
      seed?: number;
      algorithm?: AlgorithmType;
      quantumMs?: number;
      workloadId?: string | null;
    }): Promise<SimulationResponse | null> => {
      const targetUsers = overrides?.users ?? users;
      const targetSeed = overrides?.seed ?? seed;
      const targetAlgo = overrides?.algorithm ?? algorithm;
      const targetQuantum = overrides?.quantumMs ?? quantumMs;
      const targetWorkloadId = overrides?.workloadId ?? null;

      setIsLoading(true);
      setError(null);
      try {
        // Generate workload through backend unless an explicit workloadId was provided
        let activeWorkloadId = targetWorkloadId;
        if (!activeWorkloadId) {
          const wl = await api.createWorkload(targetUsers, targetSeed);
          setWorkload(wl);
          activeWorkloadId = wl.workload_id;
        }

        const [sim, cmp] = await Promise.all([
          api.startSimulation({
            workload_id: activeWorkloadId,
            users: targetUsers,
            seed: targetSeed,
            algorithm: targetAlgo,
            quantum_ms: targetQuantum,
          }),
          api.compare({
            workload_id: activeWorkloadId,
            users: targetUsers,
            seed: targetSeed,
            quantum_ms: targetQuantum,
          }),
        ]);

        setSimulation(sim);
        setComparison(cmp);
        setBackendConnected(true);
        return sim;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [users, seed, algorithm, quantumMs, handleError]
  );

  // Hydrate initial default state from backend on first load
  useEffect(() => {
    void (async () => {
      try {
        const wl = await api.createWorkload(50, 28);
        setWorkload(wl);
        const [sim, cmp] = await Promise.all([
          api.startSimulation({
            workload_id: wl.workload_id,
            users: 50,
            seed: 28,
            algorithm: 'rr',
            quantum_ms: 5.0,
          }),
          api.compare({
            workload_id: wl.workload_id,
            users: 50,
            seed: 28,
            quantum_ms: 5.0,
          }),
        ]);
        setSimulation(sim);
        setComparison(cmp);
        setBackendConnected(true);
      } catch (err) {
        handleError(err);
      }
    })();
  }, [handleError]);

  return (
    <SimulationContext.Provider
      value={{
        users,
        seed,
        algorithm,
        quantumMs,
        workload,
        simulation,
        comparison,
        isLoading,
        error,
        backendConnected,
        setUsers,
        setSeed,
        setAlgorithm,
        setQuantumMs,
        clearError,
        generateWorkload,
        runSimulation,
        loadComparison,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation must be used inside SimulationProvider');
  }
  return ctx;
}

