(() => {
  "use strict";
  const API = "http://localhost:5000/api";
  let watchId = null, lastSentAt = 0, mapInstance = null, driverMarker = null;

  const notify = (message, type = "success") => typeof window.toast === "function" ? window.toast(message, type) : alert(message);
  const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  async function request(path, options = {}) {
    const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", Authorization: "Bearer " + (localStorage.getItem("ecotech-token") || ""), ...(options.headers || {}) } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) throw new Error(result.message || "Request failed");
    return result.data;
  }
  function onRoute() { return typeof profile !== "undefined" && profile.driver_status === "On Route"; }
  function setSharingUI(message) {
    const button = document.querySelector("#shareLocation");
    if (button) button.innerHTML = watchId !== null ? '<i class="fa-solid fa-location-crosshairs me-1"></i>Stop Sharing' : '<i class="fa-solid fa-location-arrow me-1"></i>Share Live Location';
    const text = document.querySelector("#gpsText");
    if (text) text.textContent = message || (watchId !== null ? "Live location sharing is active." : "Live location sharing is off.");
  }
  function setRouteUI() {
    const active = onRoute();
    document.querySelectorAll("#routeToggle,#startRoute").forEach(button => {
      button.innerHTML = active ? '<i class="fa-solid fa-stop me-1"></i>Stop Route' : '<i class="fa-solid fa-play me-1"></i>Start Route';
      button.classList.toggle("secondary", active);
      button.classList.toggle("primary", !active);
    });
    setSharingUI();
  }
  async function sendLocation(position) {
    const now = Date.now();
    if (now - lastSentAt < 10000) return;
    lastSentAt = now;
    await request("/driver/location", { method: "POST", body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }) });
    const location = { lat: position.coords.latitude, lng: position.coords.longitude };
    if (mapInstance && window.google?.maps) {
      if (!driverMarker) driverMarker = new google.maps.Marker({ position: location, map: mapInstance, title: "Your live location", icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#287ce5", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 } });
      else driverMarker.setPosition(location);
      mapInstance.setCenter(location);
    }
    setSharingUI("Live location shared. Accuracy: " + Math.round(position.coords.accuracy) + " m");
  }
  function startSharing() {
    if (!onRoute()) return notify("Start the route before sharing live location.", "info");
    if (!navigator.geolocation) return notify("GPS is not supported by this browser.", "error");
    if (watchId !== null) return setSharingUI();
    setSharingUI("Requesting precise GPS location...");
    watchId = navigator.geolocation.watchPosition(
      position => sendLocation(position).catch(error => notify(error.message, "error")),
      error => {
        const messages = { 1: "Location permission was not granted.", 2: "GPS signal is unavailable. Turn on phone location and try again.", 3: "GPS request timed out." };
        notify(messages[error.code] || "Unable to get location.", "error");
        watchId = null; setSharingUI(messages[error.code] || "Live location sharing is off.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
    setSharingUI("Live location sharing is starting...");
  }
  function stopSharing(message = "Live location sharing is off.") {
    if (watchId !== null) navigator.geolocation?.clearWatch(watchId);
    watchId = null; setSharingUI(message);
  }
  window.driverLiveLocation = { isSharing: () => watchId !== null, start: startSharing, stop: stopSharing };

  function stops() {
    return (typeof bins !== "undefined" ? bins : []).filter(bin => Number.isFinite(Number(bin.latitude)) && Number.isFinite(Number(bin.longitude)));
  }
  async function renderLocationMap() {
    const element = document.querySelector("#map");
    if (!element) return;
    try {
      const maps = await loadGoogleMaps(), routeStops = stops();
      const center = routeStops[0] ? { lat: Number(routeStops[0].latitude), lng: Number(routeStops[0].longitude) } : { lat: 15.145, lng: 76.921 };
      element.innerHTML = ""; mapInstance = new maps.Map(element, { center, zoom: routeStops.length ? 14 : 13, mapTypeControl: true, streetViewControl: false, fullscreenControl: true, gestureHandling: "greedy" });
      routeStops.forEach((bin, index) => {
        const marker = new maps.Marker({ position: { lat: Number(bin.latitude), lng: Number(bin.longitude) }, map: mapInstance, label: { text: String(index + 1), color: "#fff", fontWeight: "700" }, icon: { path: maps.SymbolPath.CIRCLE, scale: 11, fillColor: "#e4a928", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }, title: "Stop " + (index + 1) + ": " + bin.bin_code });
        const info = new maps.InfoWindow({ content: "<b>Stop " + (index + 1) + ": " + safe(bin.bin_code) + "</b><br>" + safe(bin.location) + "<br>Fill level: " + bin.current_level + "%" });
        marker.addListener("click", () => info.open({ map: mapInstance, anchor: marker }));
      });
    } catch (error) {
      element.innerHTML = '<div class="empty"><i class="fa-solid fa-map-location-dot"></i><b>Google Maps is unavailable</b><p>' + safe(error.message) + "</p></div>";
    }
  }

  window.locationPage = async function () {
    const route = await request("/driver/route/today");
    bins = route.bins || [];
    const active = onRoute(), sharing = watchId !== null;
    setTimeout(renderLocationMap, 40);
    return '<div class="page-title"><h2>Live Route Navigation</h2><p>Control your route and choose when to share live GPS location.</p></div><section class="card"><div class="head"><div><h3>' + safe(route.routeName || "Today’s route") + '</h3><p id="gpsText">' + (sharing ? "Live location sharing is active." : "Live location sharing is off.") + '</p></div><div class="d-flex gap-2 flex-wrap"><button class="' + (active ? "secondary" : "primary") + '" id="routeToggle"><i class="fa-solid ' + (active ? "fa-stop" : "fa-play") + ' me-1"></i>' + (active ? "Stop Route" : "Start Route") + '</button><button class="secondary" id="shareLocation"><i class="fa-solid ' + (sharing ? "fa-location-crosshairs" : "fa-location-arrow") + ' me-1"></i>' + (sharing ? "Stop Sharing" : "Share Live Location") + '</button><button class="secondary" id="openGoogleNavigation"><i class="fa-solid fa-diamond-turn-right me-1"></i>Navigate to next bin</button></div></div><div id="map" class="map large"></div><div class="border rounded p-3 mt-3 small text-muted"><i class="fa-solid fa-shield-halved text-success me-2"></i>Live location is shared only while you keep Share Live Location enabled.</div></section>';
  };
  window.initMap = renderLocationMap;

  async function toggleRoute(source) {
    if (onRoute()) {
      stopSharing("Route stopped. Live location sharing has ended.");
      await request("/driver/status", { method: "PUT", body: JSON.stringify({ status: "Available" }) });
      profile.driver_status = "Available";
      notify("Route stopped successfully.");
    } else {
      await request("/driver/status", { method: "PUT", body: JSON.stringify({ status: "On Route" }) });
      profile.driver_status = "On Route";
      notify("Route started. Turn on live sharing when you are ready.");
      if (source === "startRoute") {
        const route = await request("/driver/route/today"), first = (route.bins || []).find(bin => Number.isFinite(Number(bin.latitude)) && Number.isFinite(Number(bin.longitude)));
        if (first) window.open("https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(first.latitude + "," + first.longitude) + "&travelmode=driving&dir_action=navigate", "_blank", "noopener");
      }
    }
    setRouteUI();
    if (typeof render === "function") render(source === "startRoute" ? "route" : "dashboard");
  }

  document.addEventListener("click", async event => {
    const share = event.target.closest("#shareLocation");
    const route = event.target.closest("#routeToggle,#startRoute");
    if (!share && !route) return;
    event.preventDefault(); event.stopImmediatePropagation();
    try {
      if (share) watchId !== null ? stopSharing() : startSharing();
      else await toggleRoute(route.id === "startRoute" ? "startRoute" : "routeToggle");
    } catch (error) { notify(error.message || "Unable to update route.", "error"); }
  }, true);

  new MutationObserver(() => setTimeout(setRouteUI, 30)).observe(document.documentElement, { childList: true, subtree: true });
})();
