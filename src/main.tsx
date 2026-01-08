import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@/models'; // Register models
import App from './App';
import { modelRegistry } from '@/core/registry';

console.log('[Main] Registering global for debug');
(window as any).EHT_REGISTRY = modelRegistry;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
