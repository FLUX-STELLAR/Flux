import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import LandingPage from './LandingPage.js';
import './landing.css';
import './styles.css';

const Experience = import.meta.env.MODE === 'public' ? null : lazy(() => import('./Experience.js'));

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div role="status">Loading Flux…</div>}>
      {Experience ? <Experience /> : <LandingPage publicSite />}
    </Suspense>
  </React.StrictMode>,
);
