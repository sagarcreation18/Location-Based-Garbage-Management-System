/*
 * Copy this file to maps-config.js, then paste your browser-restricted
 * Google Maps JavaScript API key. Never commit maps-config.js.
 */
window.GOOGLE_MAPS_API_KEY = "PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE";

window.loadGoogleMaps = function loadGoogleMaps() {
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (window.__googleMapsPromise) return window.__googleMapsPromise;
  if (!window.GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY.startsWith("PASTE_")) {
    return Promise.reject(new Error("Add your Google Maps API key to maps-config.js before opening the map."));
  }
  window.__googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.GOOGLE_MAPS_API_KEY)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Google Maps could not load. Check the API key, Maps JavaScript API, and key restrictions."));
    document.head.appendChild(script);
  });
  return window.__googleMapsPromise;
};
