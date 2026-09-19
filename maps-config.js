/*
 * Secure Maps loader for both application URLs:
 * - Node backend: /app/maps-config.js is generated from backend/.env.
 * - VS Code Live Server: this loader fetches that generated configuration
 *   from the local backend, so no key is committed to GitHub.
 */
(() => {
  "use strict";
  const backendOrigin = location.port === "5000"
    ? location.origin
    : `${location.protocol}//${location.hostname}:5000`;

  async function getConfiguredKey() {
    if (window.GOOGLE_MAPS_API_KEY && !window.GOOGLE_MAPS_API_KEY.startsWith("PASTE_")) {
      return window.GOOGLE_MAPS_API_KEY;
    }
    const response = await fetch(`${backendOrigin}/app/maps-config.js`, { cache: "no-store" });
    if (!response.ok) throw new Error("Start the EcoSmart backend before opening Maps.");
    const source = await response.text();
    const match = source.match(/window\.GOOGLE_MAPS_API_KEY\s*=\s*("(?:[^"\\]|\\.)*")\s*;/);
    if (!match) throw new Error("Google Maps is not configured in backend/.env.");
    const key = JSON.parse(match[1]);
    if (!key) throw new Error("Google Maps is not configured in backend/.env.");
    window.GOOGLE_MAPS_API_KEY = key;
    return key;
  }

  window.loadGoogleMaps = function loadGoogleMaps() {
    if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
    if (window.__googleMapsPromise) return window.__googleMapsPromise;
    window.__googleMapsPromise = getConfiguredKey().then(key => new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
      script.async = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error("Google Maps could not load. Check Google Cloud key restrictions and billing."));
      document.head.appendChild(script);
    }));
    return window.__googleMapsPromise;
  };
})();
