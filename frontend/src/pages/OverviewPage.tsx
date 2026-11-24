import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const OverviewPage: React.FC = () => {
  return (
    <div>
      {/* HERO SECTION */}
      <section className="page-pad overview-hero">
        <div className="container-max" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="hero-eyebrow label-md">
            <span className="lime-square" />
            <span>Guided Interactive Experiment</span>
          </div>

          <h1 className="headline-2xl" style={{ maxWidth: '60rem' }}>
            UNDERSTAND HOW A CPU HANDLES EXAM REQUESTS
          </h1>

          <p className="body-lg hero-sub">
            Imagine hundreds of students taking an online exam at the same time. Every student loads questions, saves
            answers, and submits their exam. How does the CPU handle all these requests?
          </p>

          <div style={{ paddingTop: '0.5rem' }}>
            <Link to="/simulator" className="btn-primary label-lg">
              <span>START EXPERIMENT</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* SIMPLE VISUAL PIPELINE + 3 EXPLANATIONS */}
      <section className="page-pad" style={{ paddingTop: '3rem', paddingBottom: '3.5rem' }}>
        <div className="container-max" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Visual Pipeline */}
          <div>
            <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '0.75rem' }}>
              HOW AN EXAM REQUEST TRAVELS THROUGH THE SERVER
            </span>
            <div className="flow-strip">
              <div className="flow-node">
                <span className="label-sm text-muted">01</span>
                <span className="headline-sm">STUDENTS</span>
                <span className="body-sm text-muted">10 to 200 taking the exam</span>
              </div>

              <div className="flow-arrow label-lg" aria-hidden="true">
                →
              </div>

              <div className="flow-node">
                <span className="label-sm text-muted">02</span>
                <span className="headline-sm">EXAM REQUESTS</span>
                <span className="body-sm text-muted">Load, Save, and Submit tasks</span>
              </div>

              <div className="flow-arrow label-lg" aria-hidden="true">
                →
              </div>

              <div className="flow-node highlight">
                <span className="label-sm">03</span>
                <span className="headline-sm">CPU</span>
                <span className="body-sm">Processes one turn at a time</span>
              </div>

              <div className="flow-arrow label-lg" aria-hidden="true">
                →
              </div>

              <div className="flow-node done">
                <span className="label-sm" style={{ color: 'var(--primary-fixed)' }}>
                  04
                </span>
                <span className="headline-sm">COMPLETED</span>
                <span className="body-sm" style={{ color: 'var(--secondary-fixed)' }}>
                  Responses saved &amp; returned
                </span>
              </div>
            </div>
          </div>

          {/* Three Short Explanations */}
          <div className="explain-3-grid">
            <div className="panel-box">
              <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>
                STEP 01
              </span>
              <h2 className="headline-sm" style={{ marginBottom: '0.5rem' }}>
                Students request exam operations.
              </h2>
              <p className="body-md text-muted" style={{ margin: 0 }}>
                Each student loads exam questions, saves answers multiple times, and submits the final exam.
              </p>
            </div>

            <div className="panel-box">
              <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>
                STEP 02
              </span>
              <h2 className="headline-sm" style={{ marginBottom: '0.5rem' }}>
                The CPU processes these requests.
              </h2>
              <p className="body-md text-muted" style={{ margin: 0 }}>
                When many requests arrive together, they line up in memory and wait for CPU time.
              </p>
            </div>

            <div className="panel-box">
              <span className="label-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>
                STEP 03
              </span>
              <h2 className="headline-sm" style={{ marginBottom: '0.5rem' }}>
                Scheduling algorithms decide which request gets processed first.
              </h2>
              <p className="body-md text-muted" style={{ margin: 0 }}>
                Test First Come, First Served against Round Robin to see how waiting and response times change.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
