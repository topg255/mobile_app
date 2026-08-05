import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function syncSwToken() {
  if (!('serviceWorker' in navigator)) return;
  const send = () => {
    const token = localStorage.getItem('token');
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.active?.postMessage(
          token ? { type: 'SET_TOKEN', token } : { type: 'CLEAR_TOKEN' }
        );
      })
      .catch(() => {});
  };
  send();
  window.addEventListener('storage', send);
}

// Enregistrement du Service Worker (PWA + Web Push)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(() => syncSwToken()).catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NAVIGATE' && event.data.url) {
      window.location.href = event.data.url;
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)