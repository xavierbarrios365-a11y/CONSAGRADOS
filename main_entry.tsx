console.log('--- MAIN_ENTRY DIAGNOSTIC START ---');
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

console.log('--- STARTING DYNAMIC IMPORT OF APP ---');
import('./App.tsx')
  .then((module) => {
    console.log('✅ App module loaded successfully');
    const App = module.default;
    const rootElement = document.getElementById('root');
    if (rootElement) {
      console.log('Mounting App...');
      const root = ReactDOM.createRoot(rootElement);
      root.render(<App />);
      console.log('App render called.');
    }
  })
  .catch((err) => {
    console.error('❌ FATAL ERROR LOADING APP:', err);
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `<div style="background: red; color: white; padding: 20px;"><h1>FATAL ERROR: ${err.message}</h1><pre>${err.stack}</pre></div>`;
    }
  });
console.log('--- DYNAMIC IMPORT TRIGGERED ---');
