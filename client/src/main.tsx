import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force cache bust - debug logs removed v5
createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA (skip on kitchen page)
if ('serviceWorker' in navigator && !window.location.pathname.includes('/kitchen')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ PWA: Service worker registered');

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((error) => {
        console.warn('⚠️ PWA: Service worker registration failed:', error);
      });
  });
}
