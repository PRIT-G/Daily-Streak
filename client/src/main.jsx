import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initErrorTracking } from './lib/errorTracking.js';
import './styles.css';

initErrorTracking();

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
