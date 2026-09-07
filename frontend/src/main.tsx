import React from 'react';
import { createRoot } from 'react-dom/client';
import Experience from './Experience.js';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Experience />
  </React.StrictMode>,
);
