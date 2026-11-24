import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, StepForward, RotateCcw, ArrowRight, Check } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import type { AlgorithmType, SimulationEvent } from '../types/api';

const USER_PRESETS = [10, 25, 50, 100, 200];
const SPEED_OPTIONS = [
  { label: '1x (Slow)', value: 1 },
  { label: '10x (Normal)', value: 10 },
  { label: '40x (Fast)', value: 40 },
];

function friendlyTaskName(kind: string | null | undefined): string {
  if (kind === 'load_question') return 'Load Question';
  if (kind === 'save_answer') return 'Save Answer';
  if (kind === 'submit_exam') return 'Submit Exam';
  return 'Waiting for Request';
}

export const SimulatorPage: React.FC = () => {
  const {
    users,
    seed,
    algorithm,
    quantumMs,
    simulation,
    isLoading,
    error,
    setUsers,
    setAlgorithm,
    setQuantumMs,
    runSimulation,
  } = useSimulation();

  const [clockMs, setClockMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(10);
  const [selectedSlice, setSelectedSlice] = useState<SimulationEvent | null>(null);
  const [hasTriggeredRun, setHasTriggeredRun] = useState<boolean>(false);

  const currentConfigKey = `${users}-${seed}-${algorithm}-${algorithm === 'rr' ? quantumMs.toFixed(1) : 'fcfs'}`;
  const [lastRunKey, setLastRunKey] = useState<string>('');

  const simMatchesCurrentConfig = Boolean(simulation && hasTriggeredRun && lastRunKey === currentConfigKey);
  const events = simMatchesCurrentConfig && simulation ? simulation.events : [];
  const completionMs = simMatchesCurrentConfig && simulation ? simulation.metrics.completion_ms : 0;

  // Reset playback whenever user changes settings before running again
  const handleSelectUsers = (val: number) => {
    setIsPlaying(false);
    setClockMs(0);
    setSelectedSlice(null);
    setUsers(val);
  };

  const handleSelectAlgorithm = (algo: AlgorithmType) => {
    setIsPlaying(false);
    setClockMs(0);
    setSelectedSlice(null);
    setAlgorithm(algo);
  };

  const handleAdjustQuantum = (delta: number) => {
    setIsPlaying(false);
    setClockMs(0);
    setSelectedSlice(null);
    const next = Math.round(Math.max(1.0, Math.min(20.0, quantumMs + delta)) * 10) / 10;
    setQuantumMs(next);
  };

  const handleGenerateAndStart = async () => {
    setIsPlaying(false);
    setSelectedSlice(null);
    const sim = await runSimulation({ users, seed, algorithm, quantumMs });
    if (sim) {
      setLastRunKey(currentConfigKey);
      setHasTriggeredRun(true);
      setClockMs(0);
      setIsPlaying(true);
    }
  };

  // Playback timer advancing clockMs across backend events
  useEffect(() => {
    if (!isPlaying || events.length === 0 || completionMs <= 0) return;

    const tickRealMs = 50;
    const simStepPerTick = (tickRealMs / 120) * speed;

    const timer = window.setInterval(() => {
      setClockMs((prev) => {
        const next = prev + simStepPerTick;
        if (next >= completionMs) {
          setIsPlaying(false);
          return completionMs;
        }
        return next;
      });
    }, tickRealMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, speed, completionMs, events.length]);

  // Compute live CPU status, current task, waiting requests, completed requests, and timeline window
  const cpuState = useMemo(() => {
    if (!simMatchesCurrentConfig || !simulation || events.length === 0) {
      return {
        statusLabel: 'Waiting' as const,
        statusVariant: 'waiting' as const,
        activeEvent: null as SimulationEvent | null,
        sliceElapsed: 0,
        sliceProgressPct: 0,
        waitingRequests: [],
        waitingCount: 0,
        completedCount: 0,
        recentCompleted: [] as { task_id: string; kind: string | null; end_ms: number }[],
        timelineSlices: [] as { event: SimulationEvent; state: 'completed' | 'processing' | 'waiting' }[],
        activeIndex: -1,
      };
    }

    const totalTasks = simulation.metrics.tasks;
    const isFinished = clockMs >= completionMs && completionMs > 0;

    let activeIndex = -1;
    let activeEvent: SimulationEvent | null = null;
    const completedList: { task_id: string; kind: string | null; end_ms: number }[] = [];

    for (let idx = 0; idx < events.length; idx++) {
      const ev = events[idx];
      if (ev.end_ms <= clockMs) {
        if (ev.completed && ev.task_id) {
          completedList.push({ task_id: ev.task_id, kind: ev.kind, end_ms: ev.end_ms });
        }
      } else if (ev.start_ms <= clockMs && clockMs < ev.end_ms) {
        activeIndex = idx;
        activeEvent = ev;
        break;
      } else {
        if (activeIndex === -1) activeIndex = idx;
        break;
      }
    }

    // Build a readable window around the active turn for the CPU Activity Timeline (up to 36 slices)
    let windowStart = 0;
    let windowEnd = Math.min(events.length, 36);
    if (isFinished) {
      windowStart = Math.max(0, events.length - 36);
      windowEnd = events.length;
    } else if (activeIndex > 20) {
      windowStart = Math.max(0, activeIndex - 20);
      windowEnd = Math.min(events.length, windowStart + 36);
    }

    const timelineSlices = events.slice(windowStart, windowEnd).map((ev) => {
      let state: 'completed' | 'processing' | 'waiting' = 'waiting';
      if (ev.end_ms <= clockMs || isFinished) {
        state = 'completed';
      } else if (ev.start_ms <= clockMs && clockMs < ev.end_ms) {
        state = ev.type === 'execute' ? 'processing' : 'waiting';
      }
      return { event: ev, state };
    });

    if (isFinished) {
      return {
        statusLabel: 'Completed' as const,
        statusVariant: 'completed' as const,
        activeEvent: null,
        sliceElapsed: 0,
        sliceProgressPct: 100,
        waitingRequests: [],
        waitingCount: 0,
        completedCount: totalTasks,
        recentCompleted: completedList.slice(-8),
        timelineSlices,
        activeIndex: events.length - 1,
      };
    }

    if (clockMs === 0) {
      return {
        statusLabel: 'Waiting' as const,
        statusVariant: 'waiting' as const,
        activeEvent: null,
        sliceElapsed: 0,
        sliceProgressPct: 0,
        waitingRequests: events[0]?.ready_queue ?? [],
        waitingCount: events[0]?.ready_queue_depth ?? 0,
        completedCount: 0,
        recentCompleted: [],
        timelineSlices,
        activeIndex: 0,
      };
    }

    if (activeEvent && activeEvent.type === 'execute') {
      const sliceElapsed = Math.max(0, clockMs - activeEvent.start_ms);
      const sliceProgressPct =
        activeEvent.duration_ms > 0 ? Math.min(100, (sliceElapsed / activeEvent.duration_ms) * 100) : 100;

      return {
        statusLabel: isPlaying ? ('Processing' as const) : ('Paused' as const),
        statusVariant: isPlaying ? ('processing' as const) : ('waiting' as const),
        activeEvent,
        sliceElapsed,
        sliceProgressPct,
        waitingRequests: activeEvent.ready_queue,
        waitingCount: activeEvent.ready_queue_depth,
        completedCount: completedList.length,
        recentCompleted: completedList.slice(-8),
        timelineSlices,
        activeIndex,
      };
    }

    return {
      statusLabel: 'Waiting' as const,
      statusVariant: 'waiting' as const,
      activeEvent: null,
      sliceElapsed: 0,
      sliceProgressPct: 0,
      waitingRequests: [],
      waitingCount: 0,
      completedCount: completedList.length,
      recentCompleted: completedList.slice(-8),
      timelineSlices,
      activeIndex,
    };
  }, [simMatchesCurrentConfig, simulation, events, clockMs, completionMs, isPlaying]);

  const handlePlay = () => {
    if (!simMatchesCurrentConfig) return;
    if (clockMs >= completionMs) {
      setClockMs(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleNextStep = () => {
    if (!simMatchesCurrentConfig || events.length === 0) return;
    setIsPlaying(false);
    const nextEv = events.find((ev) => ev.end_ms > clockMs + 1e-6);
    setClockMs(nextEv ? nextEv.end_ms : completionMs);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setClockMs(0);
    setSelectedSlice(null);
  };

  const isCompleted = simMatchesCurrentConfig && clockMs >= completionMs && completionMs > 0;
  const activeStepNumber = isCompleted ? 4 : simMatchesCurrentConfig ? 4 : 3;

  const totalTimelineWindowDuration = Math.max(
    1,
    cpuState.timelineSlices.reduce((acc, s) => acc + s.event.duration_ms, 0)
  );

  return (
    <div>
      {/* 4-STEP PROGRESS INDICATOR */}
      <div className="stepper-bar" aria-label="Experiment Progress">
        <div className="stepper-item completed">
          <span className="label-sm">STEP 1</span>
          <span className="label-md">Choose students ({users})</span>
        </div>
        <div className="stepper-item completed">
          <span className="label-sm">STEP 2</span>
          <span className="label-md">
            Choose method ({algorithm === 'fcfs' ? 'FCFS' : `RR ${quantumMs.toFixed(1)}ms`})
          </span>
        </div>
        <div className={`stepper-item${simMatchesCurrentConfig ? ' completed' : ' active'}`}>
          <span className="label-sm">STEP 3</span>
          <span className="label-md">Run simulation</span>
        </div>
        <div
          className={`stepper-item${
            isCompleted ? ' completed' : activeStepNumber === 4 ? ' active' : ''
          }`}
        >
          <span className="label-sm">STEP 4</span>
          <span className="label-md">View results</span>
        </div>
      </div>

      {/* STEP 1 + STEP 2 + STEP 3 */}
      <section className="page-pad sim-section">
        <div className="container-max">
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 className="headline-xl">CPU SCHEDULING EXPERIMENT</h1>
            <p className="body-md text-muted" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Follow the four steps below to simulate how a server CPU handles simultaneous online exam requests.
            </p>
          </div>

          <div className="sim-setup-grid">
            {/* STEP 1: CHOOSE STUDENTS */}
            <div className="step-card">
              <span className="step-badge label-sm">STEP 1 — CHOOSE STUDENTS</span>
              <div>
                <h2 className="headline-sm" style={{ marginBottom: '0.35rem' }}>
                  How many students are taking the exam?
                </h2>
                <p className="body-sm text-muted" style={{ margin: 0 }}>
                  More students means more requests for the CPU to process.
                </p>
              </div>

              <div className="burst-selector-grid">
                {USER_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={isLoading}
                    className={`burst-pill-btn label-md${users === val ? ' active' : ''}`}
                    onClick={() => handleSelectUsers(val)}
                  >
                    {val}
                  </button>
                ))}
              </div>

              <div
                style={{
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--on-surface)',
                  padding: '0.75rem',
                }}
                className="body-sm"
              >
                <strong>{users} students</strong> will send <strong>{users * 5} exam requests</strong> (loading
                questions, saving answers, and submitting the exam).
              </div>
            </div>

            {/* STEP 2 & STEP 3: CHOOSE METHOD + RUN */}
            <div className="step-card">
              <span className="step-badge label-sm">STEP 2 — CHOOSE SCHEDULING METHOD</span>
              <h2 className="headline-sm" style={{ margin: 0 }}>
                How should the CPU decide which request runs next?
              </h2>

              <div className="policy-grid">
                <button
                  type="button"
                  disabled={isLoading}
                  className={`policy-card${algorithm === 'fcfs' ? ' active' : ''}`}
                  onClick={() => handleSelectAlgorithm('fcfs')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <span className="headline-sm" style={{ display: 'block' }}>
                        FCFS
                      </span>
                      <span className="label-sm text-muted">First Come, First Served</span>
                    </div>
                    <span className="radio-box">
                      <span className={`radio-box-inner${algorithm === 'fcfs' ? ' checked' : ''}`} />
                    </span>
                  </div>
                  <p className="body-sm text-muted" style={{ margin: 0 }}>
                    The CPU handles requests in the order they arrive. The first request gets processed completely
                    before the next one.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  className={`policy-card${algorithm === 'rr' ? ' active' : ''}`}
                  onClick={() => handleSelectAlgorithm('rr')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <span className="headline-sm" style={{ display: 'block' }}>
                        Round Robin
                      </span>
                      <span className="label-sm text-muted">Fair Time Turns</span>
                    </div>
                    <span className="radio-box">
                      <span className={`radio-box-inner${algorithm === 'rr' ? ' checked' : ''}`} />
                    </span>
                  </div>
                  <p className="body-sm text-muted" style={{ margin: 0 }}>
                    The CPU gives each request a small amount of processing time and then moves to the next request if
                    more work remains.
                  </p>
                </button>
              </div>

              {algorithm === 'rr' && (
                <div className="quantum-box">
                  <div>
                    <div className="label-md">How much time should each request get?</div>
                    <span className="tech-term">Time Allowed Per Turn (Technical term: Time Quantum)</span>
                  </div>

                  <div className="stepper-row">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => handleAdjustQuantum(-0.5)}
                      aria-label="Decrease time quantum"
                    >
                      −
                    </button>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                      <span className="headline-md">{quantumMs.toFixed(1)}</span>
                      <span className="label-md text-muted">ms</span>
                    </div>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => handleAdjustQuantum(0.5)}
                      aria-label="Increase time quantum"
                    >
                      +
                    </button>
                  </div>

                  <p className="body-sm text-muted" style={{ margin: 0 }}>
                    This is called the Time Quantum. It decides how long a request can use the CPU in one turn (default:
                    5 ms).
                  </p>
                </div>
              )}

              {/* STEP 3 BUTTON */}
              <div style={{ borderTop: '1px solid rgba(28,28,23,0.2)', paddingTop: '1rem' }}>
                <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  STEP 3 — RUN SIMULATION
                </span>
                <button
                  type="button"
                  disabled={isLoading}
                  className="btn-primary label-md"
                  style={{ width: '100%' }}
                  onClick={() => void handleGenerateAndStart()}
                >
                  <Play size={16} />
                  <span>
                    {isLoading
                      ? 'GENERATING REQUESTS & RUNNING SIMULATION...'
                      : 'GENERATE REQUESTS & START SIMULATION'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 4: WATCH THE CPU WORK */}
      <section className="page-pad sim-section" style={{ background: 'var(--surface-container-low)' }}>
        <div className="container-max">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <span className="step-badge label-sm" style={{ marginBottom: '0.4rem' }}>
                STEP 4 — WATCH THE CPU WORK
              </span>
              <h2 className="headline-lg">LIVE CPU EXECUTION</h2>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span className="label-sm text-muted" style={{ display: 'block' }}>
                  CPU STATUS
                </span>
                <span
                  className={`cpu-status-pill label-md ${
                    error ? '' : cpuState.statusVariant
                  }`}
                  style={error ? { background: 'var(--error)', color: '#ffffff' } : undefined}
                >
                  <span
                    className={`status-dot${cpuState.statusVariant === 'processing' ? ' busy' : error ? ' error' : ''}`}
                    style={{ width: 8, height: 8 }}
                  />
                  <span>{error ? 'Error' : cpuState.statusLabel}</span>
                </span>
              </div>

              <div
                style={{
                  border: '1px solid var(--on-surface)',
                  background: 'var(--surface-container-lowest)',
                  padding: '0.4rem 0.85rem',
                }}
              >
                <span className="label-sm text-muted" style={{ display: 'block' }}>
                  SIMULATION TIME
                </span>
                <span className="label-lg">
                  {clockMs.toFixed(2)} ms
                  {completionMs > 0 ? ` / ${completionMs.toFixed(2)} ms` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="cpu-monitor-grid">
            {/* Left: Currently Processing & Completed Requests */}
            <div className="panel-box" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span className="label-sm text-muted">CURRENTLY PROCESSING</span>
                {cpuState.activeEvent ? (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      border: '2px solid var(--on-surface)',
                      background: 'var(--primary-container)',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="headline-md">
                        #{cpuState.activeEvent.task_id} — {friendlyTaskName(cpuState.activeEvent.kind)}
                      </span>
                      <span className="label-sm" style={{ padding: '2px 6px', background: 'var(--on-surface)', color: 'var(--surface)' }}>
                        Student {(cpuState.activeEvent.user ?? 0) + 1}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }} className="label-sm">
                        <span>Turn progress</span>
                        <span>
                          {cpuState.sliceElapsed.toFixed(1)} ms of {cpuState.activeEvent.duration_ms.toFixed(1)} ms
                        </span>
                      </div>
                      <div className="progress-track" style={{ background: 'var(--surface)' }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${cpuState.sliceProgressPct}%`, background: 'var(--on-surface)' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      border: '1px solid var(--on-surface)',
                      background: 'var(--surface-container-low)',
                      padding: '1rem',
                    }}
                  >
                    <div className="headline-sm">
                      {isCompleted
                        ? 'All exam requests finished!'
                        : simMatchesCurrentConfig
                          ? 'Press Play or Next Step below to watch the CPU'
                          : 'Click "Generate Requests & Start Simulation" above'}
                    </div>
                    <p className="body-sm text-muted" style={{ margin: '0.3rem 0 0' }}>
                      {isCompleted
                        ? `Finished all ${simulation?.metrics.tasks ?? 0} requests in ${completionMs.toFixed(2)} ms.`
                        : 'The active student request will appear here while the CPU works on it.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Completed Requests */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                  <span className="label-sm text-muted">COMPLETED REQUESTS</span>
                  <span className="label-md">
                    {cpuState.completedCount} / {simMatchesCurrentConfig ? simulation?.metrics.tasks ?? 0 : 0} finished
                  </span>
                </div>
                {cpuState.recentCompleted.length === 0 ? (
                  <div className="body-sm text-muted">No completed requests yet.</div>
                ) : (
                  <div className="completed-pills">
                    {cpuState.recentCompleted.map((item) => (
                      <span key={item.task_id} className="completed-pill label-sm">
                        <Check size={12} />
                        <span>
                          #{item.task_id} ({friendlyTaskName(item.kind)})
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Waiting Requests (Ready Queue) */}
            <div className="panel-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="label-md" style={{ display: 'block' }}>
                    WAITING REQUESTS
                  </span>
                  <span className="tech-term">Technical term: Ready Queue</span>
                </div>
                <span
                  className="label-sm"
                  style={{ padding: '2px 8px', background: 'var(--surface-container)', border: '1px solid var(--on-surface)' }}
                >
                  {cpuState.waitingCount} waiting
                </span>
              </div>

              {cpuState.waitingRequests.length === 0 ? (
                <div
                  className="body-sm text-muted"
                  style={{
                    border: '1px dashed var(--on-surface)',
                    padding: '1rem',
                    background: 'var(--surface-container-low)',
                  }}
                >
                  {isCompleted
                    ? 'No requests waiting — all finished.'
                    : 'Requests waiting for their turn on the CPU will appear here.'}
                </div>
              ) : (
                <div className="waiting-queue-list">
                  {cpuState.waitingRequests.slice(0, 6).map((item, idx) => (
                    <div key={`${item.task_id}-${idx}`} className={`queue-pill${idx === 0 ? ' next' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="label-sm">
                        <span>#{item.task_id}</span>
                        <span className="text-muted">{item.remaining_ms.toFixed(1)} ms left</span>
                      </div>
                      <div className="body-sm">{friendlyTaskName(item.kind)}</div>
                      {idx === 0 && <span className="label-sm text-primary-ink">Next in line</span>}
                    </div>
                  ))}
                </div>
              )}

              {cpuState.waitingCount > 6 && (
                <div className="label-sm text-muted">+{cpuState.waitingCount - 6} more requests waiting in line</div>
              )}
            </div>
          </div>

          {/* CPU ACTIVITY TIMELINE (GANTT CHART) */}
          <div className="gantt-box">
            <div className="gantt-header">
              <div>
                <span className="headline-sm" style={{ display: 'block' }}>
                  CPU ACTIVITY TIMELINE
                </span>
                <span className="tech-term">Technical term: Gantt Chart</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }} className="label-sm">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: 11, height: 11, background: 'var(--primary-container)', border: '1px solid var(--on-surface)', display: 'inline-block' }} />
                  Lime: Currently processing
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: 11, height: 11, background: 'var(--surface-dim)', border: '1px solid var(--on-surface)', display: 'inline-block' }} />
                  Grey: Waiting
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: 11, height: 11, background: 'var(--on-surface)', display: 'inline-block' }} />
                  Black: Completed
                </span>
              </div>
            </div>

            <div className="gantt-canvas-wrap">
              {cpuState.timelineSlices.length === 0 ? (
                <div
                  className="gantt-track"
                  style={{ alignItems: 'center', justifyContent: 'center', background: 'var(--surface-container-low)' }}
                >
                  <span className="body-sm text-muted">
                    Run Step 3 above to generate the CPU Activity Timeline from actual simulation events.
                  </span>
                </div>
              ) : (
                <div style={{ minWidth: '680px' }}>
                  <div className="gantt-ruler label-sm">
                    <span>{cpuState.timelineSlices[0].event.start_ms.toFixed(1)} ms</span>
                    <span>
                      {cpuState.timelineSlices[cpuState.timelineSlices.length - 1].event.end_ms.toFixed(1)} ms
                    </span>
                  </div>

                  <div className="gantt-track">
                    {cpuState.timelineSlices.map(({ event, state }) => {
                      const pct = (event.duration_ms / totalTimelineWindowDuration) * 100;
                      const stateClass =
                        state === 'processing'
                          ? 'state-processing'
                          : state === 'completed'
                            ? 'state-completed'
                            : 'state-waiting';

                      return (
                        <button
                          key={event.seq}
                          type="button"
                          className={`gantt-slice ${stateClass}`}
                          style={{ width: `${Math.max(pct, 1.5)}%` }}
                          onClick={() => setSelectedSlice(event)}
                          title={
                            event.type === 'idle'
                              ? `CPU Waiting (${event.start_ms.toFixed(1)}–${event.end_ms.toFixed(1)} ms)`
                              : `#${event.task_id} ${friendlyTaskName(event.kind)} (${event.start_ms.toFixed(1)}–${event.end_ms.toFixed(1)} ms)`
                          }
                        >
                          <span className="label-sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {event.type === 'idle' ? 'WAIT' : event.task_id}
                          </span>
                          <span style={{ fontSize: '0.6rem', opacity: 0.85, whiteSpace: 'nowrap' }}>
                            {event.duration_ms.toFixed(1)}ms
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedSlice && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid var(--on-surface)',
                    background: 'var(--surface-container-low)',
                  }}
                  className="body-sm"
                >
                  {selectedSlice.type === 'idle'
                    ? `CPU was waiting for new student requests from ${selectedSlice.start_ms.toFixed(2)} ms to ${selectedSlice.end_ms.toFixed(2)} ms.`
                    : `Request #${selectedSlice.task_id} (${friendlyTaskName(selectedSlice.kind)}) ran on the CPU from ${selectedSlice.start_ms.toFixed(2)} ms to ${selectedSlice.end_ms.toFixed(2)} ms (${selectedSlice.duration_ms.toFixed(2)} ms).`}
                </div>
              )}
            </div>

            {/* PLAYBACK CONTROLS WITH TOOLTIPS */}
            <div className="playback-bar">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                <div className="playback-btn-group">
                  <button
                    type="button"
                    className={`playback-btn label-md${isPlaying ? ' active-action' : ''}`}
                    disabled={!simMatchesCurrentConfig || isPlaying}
                    onClick={handlePlay}
                    title="Play: Automatically advance the simulation over time"
                  >
                    <Play size={15} />
                    <span>Play</span>
                  </button>
                  <button
                    type="button"
                    className="playback-btn label-md"
                    disabled={!isPlaying}
                    onClick={handlePause}
                    title="Pause: Freeze the simulation at the current millisecond"
                  >
                    <Pause size={15} />
                    <span>Pause</span>
                  </button>
                  <button
                    type="button"
                    className="playback-btn label-md"
                    disabled={!simMatchesCurrentConfig || isCompleted}
                    onClick={handleNextStep}
                    title="Next Step: Move forward to the next CPU scheduling turn"
                  >
                    <StepForward size={15} />
                    <span>Next Step</span>
                  </button>
                  <button
                    type="button"
                    className="playback-btn label-md"
                    disabled={!simMatchesCurrentConfig}
                    onClick={handleRestart}
                    title="Restart: Reset the simulation clock back to 0 ms"
                  >
                    <RotateCcw size={15} />
                    <span>Restart</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} className="label-sm">
                  <span className="text-muted">Speed:</span>
                  {SPEED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSpeed(opt.value)}
                      className="label-sm"
                      style={{
                        padding: '0.3rem 0.55rem',
                        border: '1px solid var(--on-surface)',
                        background: speed === opt.value ? 'var(--on-surface)' : 'var(--surface)',
                        color: speed === opt.value ? 'var(--surface)' : 'var(--on-surface)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Link to="/results" className="btn-secondary label-sm" style={{ padding: '0.5rem 0.9rem' }}>
                <span>View Results</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {isCompleted && (
            <div className="complete-callout">
              <div>
                <div className="headline-sm">Simulation Complete — Ready for Step 4</div>
                <p className="body-sm" style={{ margin: '0.25rem 0 0' }}>
                  See how {algorithm === 'fcfs' ? 'FCFS' : `Round Robin (${quantumMs.toFixed(1)} ms)`} performed and
                  compare it directly with the other scheduling method.
                </p>
              </div>
              <Link to="/results" className="btn-dark label-md">
                <span>View Results &amp; Comparison</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
