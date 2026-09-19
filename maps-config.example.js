/*
 * This example file is safe to keep in Git.
 * For local development, add the real browser-restricted key to backend/.env.
 * The backend serves /app/maps-config.js dynamically from that private value.
 */
window.GOOGLE_MAPS_API_KEY = "PASTE_YOUR_BROWSER_RESTRICTED_GOOGLE_MAPS_API_KEY_HERE";

window.loadGoogleMaps = function loadGoogleMaps() {
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (window.__googleMapsPromise) return window.__googleMapsPromise;
  if (!window.GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY.startsWith("PASTE_")) {
    return Promise.reject(new Error("Add your Google Maps API key to backend/.env before opening the map."));
  }
  window.__googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.GOOGLE_MAPS_API_KEY)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Google Maps could not load."));
    document.head.appendChild(script);
  });
  return window.__googleMapsPromise;
};
