/*
 * Secure Maps loader for both application URLs:
 * - Node backend: /app/maps-config.js is generated from backend/.env.
 * - VS Code Live Server: this loader fetches that generated configuration
 *   from the local backend, so no key is committed to GitHub.
 */
(() => {
  "use strict";
  const apiLocation = (() => {
    const { protocol, hostname, port, origin } = location;
    if (port === "5000") return origin;
    if (hostname === "localhost" || hostname === "127.0.0.1" || /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname)) return `${protocol}//${hostname}:5000`;
    return origin;
  })();
  window.EcoSmartApiBase = `${apiLocation}/api`;
  // The Node app serves all pages below /app both locally and on Railway.
  // Live Server pages use port 5500 and obtain their configuration from the
  // local Node backend on port 5000 instead.
  const backendOrigin = location.pathname.startsWith("/app/")
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

  function injectMapsScript(key, attempt = 0) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.dataset.ecosmartMaps = "true";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
      script.async = true;
      const fail = () => {
        script.remove();
        if (attempt === 0) {
          setTimeout(() => injectMapsScript(key, 1).then(resolve, reject), 700);
          return;
        }
        reject(new Error("Google Maps could not load. Check your connection or try again shortly."));
      };
      script.onload = () => window.google?.maps ? resolve(window.google.maps) : fail();
      script.onerror = fail;
      document.head.appendChild(script);
    });
  }

  window.loadGoogleMaps = function loadGoogleMaps() {
    if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
    if (window.__googleMapsPromise) return window.__googleMapsPromise;
    window.__googleMapsPromise = getConfiguredKey().then(injectMapsScript);
    return window.__googleMapsPromise.catch(error => {
      window.__googleMapsPromise = null;
      throw error;
    });
  };
})();
