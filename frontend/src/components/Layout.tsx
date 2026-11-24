import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, error, backendConnected, clearError, loadComparison } = useSimulation();

  const statusText = !backendConnected
    ? 'Backend Offline'
    : isLoading
      ? 'Running...'
      : 'Engine Ready';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <NavLink to="/" className="brand-group">
            <span className="headline-sm">EXAMCORE</span>
            <span className="label-sm brand-badge">25BTRIS028</span>
          </NavLink>

          <nav className="nav-links" aria-label="Primary Navigation">
            <NavLink to="/" end className={({ isActive }) => `nav-link label-md${isActive ? ' active' : ''}`}>
              Overview
            </NavLink>
            <NavLink to="/simulator" className={({ isActive }) => `nav-link label-md${isActive ? ' active' : ''}`}>
              Simulator
            </NavLink>
            <NavLink to="/results" className={({ isActive }) => `nav-link label-md${isActive ? ' active' : ''}`}>
              Results
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => `nav-link label-md${isActive ? ' active' : ''}`}>
              About
            </NavLink>
          </nav>

          <div className="sys-status-chip">
            <span
              className={`status-dot${!backendConnected ? ' error' : isLoading ? ' busy' : ''}`}
            />
            <span className="label-sm">{statusText}</span>
          </div>
        </div>

        <nav className="mobile-nav" aria-label="Mobile Navigation">
          <NavLink to="/" end className={({ isActive }) => `mobile-nav-link label-sm${isActive ? ' active' : ''}`}>
            Overview
          </NavLink>
          <NavLink to="/simulator" className={({ isActive }) => `mobile-nav-link label-sm${isActive ? ' active' : ''}`}>
            Simulator
          </NavLink>
          <NavLink to="/results" className={({ isActive }) => `mobile-nav-link label-sm${isActive ? ' active' : ''}`}>
            Results
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `mobile-nav-link label-sm${isActive ? ' active' : ''}`}>
            About
          </NavLink>
        </nav>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <div>
            <span className="label-sm" style={{ display: 'block', marginBottom: '0.2rem' }}>
              SIMULATION ERROR
            </span>
            <span className="body-sm">{error}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary label-sm"
              style={{ padding: '0.4rem 0.75rem' }}
              onClick={() => void loadComparison()}
            >
              RETRY
            </button>
            <button
              type="button"
              className="btn-secondary label-sm"
              style={{ padding: '0.4rem 0.75rem' }}
              onClick={clearError}
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <div className="footer-inner label-sm">
          <div>EXAMCORE — USN 25BTRIS028 // CPU PERFORMANCE EVALUATION FOR ONLINE EXAM SYSTEMS</div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span>ALGORITHMS: FCFS &amp; ROUND ROBIN</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

