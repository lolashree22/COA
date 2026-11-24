import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SimulationProvider } from './context/SimulationContext';
import { AboutPage } from './pages/AboutPage';
import { OverviewPage } from './pages/OverviewPage';
import { ResultsPage } from './pages/ResultsPage';
import { SimulatorPage } from './pages/SimulatorPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SimulationProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </SimulationProvider>
    </BrowserRouter>
  );
};

export default App;

