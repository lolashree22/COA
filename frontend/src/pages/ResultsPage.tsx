import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { api } from '../api/client';
import { useSimulation } from '../context/SimulationContext';

export const ResultsPage: React.FC = () => {
  const { algorithm, simulation, comparison, isLoading, loadComparison } = useSimulation();
  const [showTechnical, setShowTechnical] = useState(false);

  if (!comparison) {
    return (
      <div className="page-pad" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div className="panel-box">
          <h1 className="headline-lg">HOW WELL DID THE CPU PERFORM?</h1>
          <p className="body-md text-muted" style={{ marginTop: '0.75rem' }}>
            {isLoading
              ? 'Loading calculated results from the simulation backend...'
              : 'No simulation results loaded yet. Run an experiment or load the comparison.'}
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary label-md" onClick={() => void loadComparison()}>
              LOAD RESULTS
            </button>
            <Link to="/simulator" className="btn-secondary label-md">
              GO TO SIMULATOR
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { fcfs, rr, deltas, sample_trace } = comparison;
  const activeMetrics =
    simulation && simulation.users === comparison.users
      ? simulation.metrics
      : algorithm === 'fcfs'
        ? fcfs
        : rr;

  const selectedAlgoLabel =
    activeMetrics.algorithm === 'fcfs'
      ? 'FCFS (First Come, First Served)'
      : `Round Robin (${(activeMetrics.quantum_ms ?? comparison.quantum_ms).toFixed(1)} ms Time Quantum)`;

  const chartMax = Math.max(
    fcfs.avg_wait_ms,
    rr.avg_wait_ms,
    fcfs.avg_turnaround_ms,
    rr.avg_turnaround_ms,
    fcfs.avg_first_response_ms,
    rr.avg_first_response_ms,
    1
  );

  const firstRespDiffPct = Math.abs(deltas.first_response_reduction_pct).toFixed(1);
  const comparisonSummary =
    deltas.first_response_delta_ms < 0
      ? `In this ${comparison.users}-student workload, Round Robin gave requests their first CPU turn ${firstRespDiffPct}% faster on average (${rr.avg_first_response_ms.toFixed(
          1
        )} ms vs ${fcfs.avg_wait_ms.toFixed(1)} ms for FCFS), ${
          deltas.wait_delta_ms < 0
            ? `and lowered total waiting time by ${Math.abs(deltas.wait_reduction_pct).toFixed(1)}%.`
            : `while average total waiting time was ${deltas.wait_reduction_pct.toFixed(
                1
              )}% higher because tasks take turns instead of finishing one after another.`
        }`
      : `Comparing FCFS and Round Robin on the exact same ${fcfs.tasks} exam requests.`;

  return (
    <div>
      {/* HEADER */}
      <section
        className="page-pad"
        style={{
          borderBottom: '1px solid var(--on-surface)',
          paddingTop: '2.5rem',
          paddingBottom: '2.5rem',
        }}
      >
        <div className="container-max" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <span className="label-md text-muted">STEP 4 // EXPERIMENT RESULTS</span>
          <h1 className="headline-2xl">HOW WELL DID THE CPU PERFORM?</h1>
          <p className="body-lg" style={{ maxWidth: '52rem', margin: 0 }}>
            The simulation processed <strong>{activeMetrics.tasks}</strong> requests from{' '}
            <strong>{activeMetrics.users}</strong> students using <strong>{selectedAlgoLabel}</strong>.
          </p>
        </div>
      </section>

      {/* FOUR EASY-TO-UNDERSTAND METRICS */}
      <section style={{ borderBottom: '1px solid var(--on-surface)' }}>
        <div className="container-max results-4-grid">
          {/* 1. Average Waiting Time */}
          <div className="result-metric-cell">
            <div>
              <div className="headline-sm">Time Spent Waiting</div>
              <span className="tech-term">Technical term: Average Waiting Time</span>
            </div>
            <div className="metric-value-big">
              {activeMetrics.avg_wait_ms.toFixed(2)}
              <span className="metric-unit">ms</span>
            </div>
            <p className="body-sm text-muted" style={{ margin: 0 }}>
              How long did requests wait before getting processed?
            </p>
          </div>

          {/* 2. Average Turnaround Time */}
          <div className="result-metric-cell">
            <div>
              <div className="headline-sm">Total Time Taken</div>
              <span className="tech-term">Technical term: Average Turnaround Time</span>
            </div>
            <div className="metric-value-big">
              {activeMetrics.avg_turnaround_ms.toFixed(2)}
              <span className="metric-unit">ms</span>
            </div>
            <p className="body-sm text-muted" style={{ margin: 0 }}>
              How long did requests take from arrival to completion?
            </p>
          </div>

          {/* 3. First Response Time */}
          <div className="result-metric-cell">
            <div>
              <div className="headline-sm">Time Until First Processing</div>
              <span className="tech-term">Technical term: First Response Time</span>
            </div>
            <div className="metric-value-big text-primary-ink">
              {activeMetrics.avg_first_response_ms.toFixed(2)}
              <span className="metric-unit">ms</span>
            </div>
            <p className="body-sm text-muted" style={{ margin: 0 }}>
              How long did requests wait before receiving CPU attention for the first time?
            </p>
          </div>

          {/* 4. CPU Utilisation */}
          <div className="result-metric-cell">
            <div>
              <div className="headline-sm">CPU Busy Time</div>
              <span className="tech-term">Technical term: CPU Utilisation</span>
            </div>
            <div className="metric-value-big">
              {activeMetrics.cpu_utilization_pct.toFixed(1)}
              <span className="metric-unit">%</span>
            </div>
            <p className="body-sm text-muted" style={{ margin: 0 }}>
              How much of the available CPU time was spent processing requests?
            </p>
          </div>
        </div>
      </section>

      {/* COMPARE BOTH SCHEDULING METHODS */}
      <section
        className="page-pad"
        style={{
          borderBottom: '1px solid var(--on-surface)',
          paddingTop: '2.5rem',
          paddingBottom: '2.5rem',
        }}
      >
        <div className="container-max" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 className="headline-lg">COMPARE BOTH SCHEDULING METHODS</h2>
            <p className="body-md text-muted" style={{ marginTop: '0.5rem', marginBottom: 0, maxWidth: '54rem' }}>
              {comparisonSummary}
            </p>
          </div>

          <div className="comparison-split">
            {/* Side-by-side summary cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="panel-box" style={{ background: 'var(--surface-container-low)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="headline-sm">FCFS (First Come, First Served)</span>
                  <span style={{ width: 12, height: 12, background: 'var(--on-surface)', display: 'inline-block' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="body-sm">
                  <div>
                    <div className="text-muted">Waiting Time</div>
                    <strong>{fcfs.avg_wait_ms.toFixed(2)} ms</strong>
                  </div>
                  <div>
                    <div className="text-muted">Total Time</div>
                    <strong>{fcfs.avg_turnaround_ms.toFixed(2)} ms</strong>
                  </div>
                  <div>
                    <div className="text-muted">First Response</div>
                    <strong>{fcfs.avg_first_response_ms.toFixed(2)} ms</strong>
                  </div>
                  <div>
                    <div className="text-muted">CPU Busy Time</div>
                    <strong>{fcfs.cpu_utilization_pct.toFixed(1)}%</strong>
                  </div>
                </div>
              </div>

              <div className="panel-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="headline-sm">
                    Round Robin (Q = {comparison.quantum_ms.toFixed(1)} ms)
                  </span>
                  <span className="lime-square" style={{ width: 12, height: 12 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="body-sm">
                  <div>
                    <div className="text-muted">Waiting Time</div>
                    <strong>{rr.avg_wait_ms.toFixed(2)} ms</strong>
                  </div>
                  <div>
                    <div className="text-muted">Total Time</div>
                    <strong>{rr.avg_turnaround_ms.toFixed(2)} ms</strong>
                  </div>
                  <div>
                    <div className="text-muted">First Response</div>
                    <strong className="text-primary-ink">{rr.avg_first_response_ms.toFixed(2)} ms</strong>
                  </div>
                  <div>
                    <div className="text-muted">CPU Busy Time</div>
                    <strong>{rr.cpu_utilization_pct.toFixed(1)}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="panel-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span className="headline-sm">SIDE-BY-SIDE TIME COMPARISON</span>
                  <span className="tech-term">Shorter bars mean faster service (in milliseconds)</span>
                </div>
                <div style={{ display: 'flex', gap: '0.85rem' }} className="label-sm">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: 10, height: 10, background: 'var(--on-surface)', display: 'inline-block' }} />
                    FCFS
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="lime-square" />
                    Round Robin
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div className="label-sm" style={{ marginBottom: '0.35rem' }}>
                    Time Spent Waiting (Average Waiting Time)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div className="chart-bar-row">
                      <span className="label-sm text-muted" style={{ width: '3.2rem' }}>FCFS</span>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill-fcfs label-sm" style={{ width: `${Math.max(12, (fcfs.avg_wait_ms / chartMax) * 100)}%` }}>
                          {fcfs.avg_wait_ms.toFixed(1)} ms
                        </div>
                      </div>
                    </div>
                    <div className="chart-bar-row">
                      <span className="label-sm text-muted" style={{ width: '3.2rem' }}>RR</span>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill-rr label-sm" style={{ width: `${Math.max(12, (rr.avg_wait_ms / chartMax) * 100)}%` }}>
                          {rr.avg_wait_ms.toFixed(1)} ms
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="label-sm" style={{ marginBottom: '0.35rem' }}>
                    Total Time Taken (Average Turnaround Time)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div className="chart-bar-row">
                      <span className="label-sm text-muted" style={{ width: '3.2rem' }}>FCFS</span>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill-fcfs label-sm" style={{ width: `${Math.max(12, (fcfs.avg_turnaround_ms / chartMax) * 100)}%` }}>
                          {fcfs.avg_turnaround_ms.toFixed(1)} ms
                        </div>
                      </div>
                    </div>
                    <div className="chart-bar-row">
                      <span className="label-sm text-muted" style={{ width: '3.2rem' }}>RR</span>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill-rr label-sm" style={{ width: `${Math.max(12, (rr.avg_turnaround_ms / chartMax) * 100)}%` }}>
                          {rr.avg_turnaround_ms.toFixed(1)} ms
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="label-sm" style={{ marginBottom: '0.35rem' }}>
                    Time Until First Processing (First Response Time)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div className="chart-bar-row">
                      <span className="label-sm text-muted" style={{ width: '3.2rem' }}>FCFS</span>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill-fcfs label-sm" style={{ width: `${Math.max(12, (fcfs.avg_first_response_ms / chartMax) * 100)}%` }}>
                          {fcfs.avg_first_response_ms.toFixed(1)} ms
                        </div>
                      </div>
                    </div>
                    <div className="chart-bar-row">
                      <span className="label-sm text-muted" style={{ width: '3.2rem' }}>RR</span>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill-rr label-sm" style={{ width: `${Math.max(12, (rr.avg_first_response_ms / chartMax) * 100)}%` }}>
                          {rr.avg_first_response_ms.toFixed(1)} ms
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPANDABLE TECHNICAL DETAILS */}
      <section style={{ borderBottom: '1px solid var(--on-surface)' }}>
        <div className="container-max" style={{ borderLeft: '1px solid var(--on-surface)', borderRight: '1px solid var(--on-surface)' }}>
          <button
            type="button"
            className="accordion-trigger"
            onClick={() => setShowTechnical((prev) => !prev)}
            aria-expanded={showTechnical}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="lime-square" />
              <span className="headline-sm">Show technical details</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} className="label-sm text-muted">
              <span>{showTechnical ? 'Hide' : 'Expand'}</span>
              {showTechnical ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {showTechnical && (
            <div
              style={{
                borderTop: '1px solid var(--on-surface)',
                padding: '1.5rem',
                background: 'var(--surface-container-low)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* Advanced Summary Metrics */}
              <div className="explain-3-grid">
                <div className="panel-box">
                  <div className="label-sm text-muted">THROUGHPUT &amp; MAKESPAN</div>
                  <div className="headline-md" style={{ margin: '0.35rem 0' }}>
                    {activeMetrics.throughput_tasks_per_s.toFixed(2)} tasks/s
                  </div>
                  <div className="body-sm text-muted">
                    Makespan: {activeMetrics.makespan_ms.toFixed(2)} ms | Total CPU Burst: {activeMetrics.total_cpu_ms.toFixed(1)} ms
                  </div>
                </div>

                <div className="panel-box">
                  <div className="label-sm text-muted">CONTEXT SWITCHES &amp; PREEMPTIONS</div>
                  <div className="headline-md" style={{ margin: '0.35rem 0' }}>
                    {rr.context_switches} RR Switches
                  </div>
                  <div className="body-sm text-muted">
                    RR Preemptions: {rr.total_preemptions} | FCFS Switches: {fcfs.context_switches}
                  </div>
                </div>

                <div className="panel-box">
                  <div className="label-sm text-muted">WORKLOAD &amp; MEMORY ESTIMATE</div>
                  <div className="headline-md" style={{ margin: '0.35rem 0' }}>
                    {activeMetrics.estimated_peak_memory_mb.toFixed(0)} MB
                  </div>
                  <div className="body-sm text-muted">
                    {comparison.users} users × 18.0 MB/user | Seed: {comparison.seed}
                  </div>
                </div>
              </div>

              {/* Per-Task Trace Table */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.65rem',
                    gap: '0.5rem',
                  }}
                >
                  <span className="label-md">PER-TASK TRACE (FIRST {sample_trace.length} REQUESTS)</span>
                  <a
                    href={api.getCsvExportUrl(comparison.users, comparison.seed, comparison.quantum_ms)}
                    download
                    className="btn-secondary label-sm"
                    style={{ padding: '0.45rem 0.85rem' }}
                  >
                    <Download size={14} />
                    <span>EXPORT CSV (.CSV)</span>
                  </a>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid var(--on-surface)', background: 'var(--surface)' }}>
                  <table className="data-table body-sm">
                    <thead>
                      <tr className="label-sm">
                        <th>Request ID</th>
                        <th>Task Type</th>
                        <th>Arrival</th>
                        <th>Burst</th>
                        <th>FCFS Wait</th>
                        <th>RR Wait</th>
                        <th>FCFS First Resp</th>
                        <th>RR First Resp</th>
                        <th>RR Preemptions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sample_trace.map((row) => (
                        <tr key={row.task_id}>
                          <td className="label-sm">{row.task_id}</td>
                          <td>{row.kind}</td>
                          <td>{row.arrival.toFixed(2)} ms</td>
                          <td>{row.burst.toFixed(2)} ms</td>
                          <td>{row.fcfs_wait_ms.toFixed(2)} ms</td>
                          <td>{row.rr_wait_ms.toFixed(2)} ms</td>
                          <td>{row.fcfs_first_response_ms.toFixed(2)} ms</td>
                          <td className="text-primary-ink">{row.rr_first_response_ms.toFixed(2)} ms</td>
                          <td>{row.rr_preemptions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TRY ANOTHER EXPERIMENT CTA */}
      <section className="page-pad" style={{ paddingTop: '2.5rem', paddingBottom: '3rem', background: 'var(--surface-container)' }}>
        <div
          className="container-max"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <h2 className="headline-md">Want to test a different student load or Time Quantum?</h2>
            <p className="body-md text-muted" style={{ margin: '0.25rem 0 0' }}>
              Return to the guided simulator and run another experiment.
            </p>
          </div>
          <Link to="/simulator" className="btn-primary label-lg">
            <span>TRY ANOTHER EXPERIMENT</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};
