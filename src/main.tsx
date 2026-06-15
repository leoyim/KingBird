import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Register Service Worker for offline support (production only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[SW] Registered:', registration.scope);

        // Auto-reload when new SW is activated
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available, reloading...');
              window.location.reload();
            }
          });
        });
      },
      (err) => {
        console.warn('[SW] Registration failed:', err);
      }
    );

    // Listen for SW messages (e.g., refresh notification)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('[SW] Update signal received, reloading...');
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
