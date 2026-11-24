import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div>
      {/* HEADER */}
      <section
        className="page-pad"
        style={{
          paddingTop: '3rem',
          paddingBottom: '2.5rem',
          borderBottom: '1px solid var(--on-surface)',
        }}
      >
        <div className="container-max" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <span className="label-md text-muted">PROJECT DOCUMENTATION</span>
          <h1 className="headline-2xl">WHY DID WE BUILD THIS?</h1>
          <p className="body-lg text-muted" style={{ maxWidth: '46rem', margin: 0 }}>
            An educational simulator showing how CPU scheduling decisions affect student responsiveness during
            high-traffic online examinations.
          </p>
        </div>
      </section>

      {/* THREE SHORT SECTIONS: PROBLEM, APPROACH, OBJECTIVE */}
      <section
        className="page-pad"
        style={{
          paddingTop: '2.5rem',
          paddingBottom: '2.5rem',
          borderBottom: '1px solid var(--on-surface)',
          background: 'var(--surface-container-low)',
        }}
      >
        <div className="container-max about-3-sections">
          <article className="panel-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <span className="label-sm text-primary-ink">01 // THE PROBLEM</span>
            <h2 className="headline-sm">Requests Pile Up Together</h2>
            <p className="body-md text-muted" style={{ margin: 0 }}>
              During an online exam, many students load questions (12 ms), save answers (4 ms), and submit exams (15 ms)
              at nearly the same time. In First Come, First Served (FCFS), long requests make short requests wait behind
              them (a convoy effect).
            </p>
          </article>

          <article className="panel-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <span className="label-sm text-primary-ink">02 // OUR APPROACH</span>
            <h2 className="headline-sm">Compare Two Scheduling Rules</h2>
            <p className="body-md text-muted" style={{ margin: 0 }}>
              We simulate identical student request bursts using two classic CPU scheduling algorithms: non-preemptive
              <strong> FCFS</strong> and time-sliced <strong>Round Robin</strong> (where each request gets a short{' '}
              <em>Time Quantum</em>, default 5 ms, before yielding to the next waiting request).
            </p>
          </article>

          <article className="panel-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <span className="label-sm text-primary-ink">03 // THE OBJECTIVE</span>
            <h2 className="headline-sm">Measure Speed vs Fairness</h2>
            <p className="body-md text-muted" style={{ margin: 0 }}>
              By calculating <strong>Average Waiting Time</strong>, <strong>Turnaround Time</strong>,{' '}
              <strong>First Response Time</strong>, and <strong>CPU Utilisation</strong>, we can clearly see how Round
              Robin gives faster initial feedback to students while FCFS finishes earlier arrivals sequentially.
            </p>
          </article>
        </div>
      </section>

      {/* PROJECT DETAILS & SIMULATION NOTE */}
      <section className="page-pad" style={{ paddingTop: '2.5rem', paddingBottom: '3rem' }}>
        <div className="container-max" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="meta-3-grid">
            <div className="meta-cell">
              <span className="label-sm text-muted">PROJECT TITLE</span>
              <div>
                <div className="headline-sm">CPU Performance Evaluation</div>
                <div className="body-sm text-muted">for Online Examination Systems</div>
              </div>
            </div>

            <div className="meta-cell">
              <span className="label-sm text-muted">SUBJECT</span>
              <div>
                <div className="headline-sm">Computer Organization</div>
                <div className="body-sm text-muted">and Architecture</div>
              </div>
            </div>

            <div className="meta-cell">
              <span className="label-sm text-muted">STUDENT USN</span>
              <div>
                <div className="headline-sm text-primary-ink">25BTRIS028</div>
                <div className="body-sm text-muted">Discrete-Event CPU Model</div>
              </div>
            </div>
          </div>

          <div
            style={{
              border: '1px solid var(--on-surface)',
              background: 'var(--surface-container-low)',
              padding: '1.25rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ padding: '0.25rem', background: 'var(--primary-container)', border: '1px solid var(--on-surface)' }}>
              <Info size={18} />
            </div>
            <div>
              <span className="label-sm" style={{ display: 'block', marginBottom: '0.3rem' }}>
                SIMULATION SCOPE NOTE
              </span>
              <p className="body-md" style={{ margin: 0 }}>
                This project uses a simulated examination workload and illustrative assumptions (5 tasks per student with
                synthetic arrival times and burst durations in <code>exam_cpu_sim.py</code>), not measurements from a
                real production examination server.
              </p>
            </div>
          </div>

          <div>
            <Link to="/simulator" className="btn-primary label-lg">
              <span>START EXPERIMENT</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
