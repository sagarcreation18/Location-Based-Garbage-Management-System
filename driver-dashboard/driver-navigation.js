(() => {
  let lastPosition = null;
  let directionsService = null;
  let directionsRenderer = null;
  let directionsRequestAt = 0;

  function routeStops() {
    return (bins || []).filter(bin => Number.isFinite(Number(bin.latitude)) && Number.isFinite(Number(bin.longitude))).map(bin => ({ lat: Number(bin.latitude), lng: Number(bin.longitude), bin }));
  }
  function navigationUrl(stopIndex = 0) {
    const stops = routeStops();
    const stop = stops[stopIndex] || stops[0];
    if (!stop) return null;
    // Mobile Google Maps supports only a limited number of waypoints. Navigate to each named bin directly.
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.lat},${stop.lng}`)}&travelmode=driving&dir_action=navigate`;
  }  function updateNavigationSummary(text, warning = false) {
    const summary = document.querySelector("#routeNavigationSummary");
    if (summary) summary.innerHTML = `<i class="fa-solid ${warning ? "fa-triangle-exclamation text-warning" : "fa-route text-success"} me-2"></i>${esc(text)}`;
  }
  function drawDirections(force = false) {
    if (!map || !googleMaps || profile?.driver_status !== "On Route") return;
    const stops = routeStops();
    if (!stops.length) { updateNavigationSummary("No mapped bin locations are assigned to this route.", true); return; }
    if (!force && Date.now() - directionsRequestAt < 45000) return;
    directionsRequestAt = Date.now();
    directionsService ||= new googleMaps.DirectionsService();
    directionsRenderer ||= new googleMaps.DirectionsRenderer({ suppressMarkers: true, polylineOptions: { strokeColor: "#1473e6", strokeOpacity: .9, strokeWeight: 6 } });
    directionsRenderer.setMap(map);
    directionsRenderer.setPanel(document.querySelector("#routeDirections"));
    const origin = lastPosition || { lat: stops[0].lat, lng: stops[0].lng };
    const destination = stops[stops.length - 1];
    const waypoints = stops.slice(0, -1).map(stop => ({ location: { lat: stop.lat, lng: stop.lng }, stopover: true }));
    updateNavigationSummary("Calculating driving route through your assigned bins...");
    directionsService.route({ origin, destination: { lat: destination.lat, lng: destination.lng }, waypoints, optimizeWaypoints: false, travelMode: googleMaps.TravelMode.DRIVING, drivingOptions: { departureTime: new Date(), trafficModel: "bestguess" } }, (result, statusCode) => {
      if (statusCode !== "OK") { updateNavigationSummary("Directions could not be calculated. Use Navigate to next bin for navigation.", true); return; }
      directionsRenderer.setDirections(result);
      const leg = result.routes[0].legs.reduce((total, item) => ({ distance: total.distance + (item.distance?.value || 0), duration: total.duration + (item.duration?.value || 0) }), { distance: 0, duration: 0 });
      updateNavigationSummary(`${stops.length} stops · ${(leg.distance / 1000).toFixed(1)} km · about ${Math.ceil(leg.duration / 60)} min`);
    });
  }
  window.locationPage = async function () {
    const response = await apiGet("/driver/route/today"); bins = response.data.bins;
    const sharing = profile.driver_status === "On Route";
    return `<div class="page-title"><h2>Live Route Navigation</h2><p>Follow your assigned collection route with real driving directions.</p></div><section class="card"><div class="head"><div><h3>${esc(response.data.routeName)}</h3><p id="gpsText">${sharing ? "Live location sharing is active." : "Start your route to enable navigation."}</p></div><div class="d-flex gap-2"><button class="primary" id="shareLocation"><i class="fa-solid ${sharing ? "fa-stop" : "fa-location-arrow"} me-1"></i>${sharing ? "Stop Route" : "Start Route"}</button><button class="secondary" id="openGoogleNavigation"><i class="fa-solid fa-diamond-turn-right me-1"></i>Navigate to next bin</button></div></div><div id="map" class="map large"></div><div id="routeNavigationSummary" class="border rounded p-3 mt-3 small text-muted"><i class="fa-solid fa-route text-success me-2"></i>Start the route to calculate directions.</div><div id="routeDirections" class="mt-3 small"></div></section>`;
  };
  window.initMap = async function () {
    const element = document.querySelector("#map"); if (!element) return;
    try {
      googleMaps = await loadGoogleMaps(); element.innerHTML = "";
      const stops = routeStops(); const initial = lastPosition || (stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : { lat: 15.145, lng: 76.921 });
      map = new googleMaps.Map(element, { center: initial, zoom: stops.length ? 14 : 13, mapTypeControl: true, fullscreenControl: true, streetViewControl: false, zoomControl: true, gestureHandling: "greedy" });
      stops.forEach((stop, index) => {
        const marker = new googleMaps.Marker({ position: { lat: stop.lat, lng: stop.lng }, map, label: { text: String(index + 1), color: "#fff", fontWeight: "700" }, icon: { path: googleMaps.SymbolPath.CIRCLE, scale: 11, fillColor: "#e4a928", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }, title: `${index + 1}. ${stop.bin.bin_code}` });
        const info = new googleMaps.InfoWindow({ content: `<b>Stop ${index + 1}: ${esc(stop.bin.bin_code)}</b><br>${esc(stop.bin.location)}<br>Fill level: ${stop.bin.current_level}%` }); marker.addListener("click", () => info.open({ map, anchor: marker }));
      });
      if (lastPosition) driverLocationMarker = new googleMaps.Marker({ position: lastPosition, map, title: "Your current location", icon: mapPin("#287ce5") });
      if (sharing) {
        navigator.geolocation?.getCurrentPosition(position => { lastPosition = { lat: position.coords.latitude, lng: position.coords.longitude }; if (driverLocationMarker) driverLocationMarker.setPosition(lastPosition); else driverLocationMarker = new googleMaps.Marker({ position: lastPosition, map, title: "Your current location", icon: mapPin("#287ce5") }); map.setCenter(lastPosition); drawDirections(true); }, () => drawDirections(true), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        drawDirections(true);
      }
    } catch (error) { element.innerHTML = `<div class="empty"><i class="fa-solid fa-map-location-dot"></i><b>Google Maps is unavailable</b><p>${esc(error.message)}</p></div>`; }
  };
  window.toggleRoute = async function () {
    try {
      if (profile.driver_status === "On Route") {
        if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
        await apiPut("/driver/status", { status: "Available" }); profile.driver_status = "Available"; directionsRenderer?.setMap(null); toast("Route stopped. Location sharing has ended."); render("dashboard");
      } else {
        await apiPut("/driver/status", { status: "On Route" }); profile.driver_status = "On Route"; startTracking(); toast("Route started. Opening live navigation..."); render("location");
      }
    } catch (error) { toast(error.message, "error"); }
  };
  document.addEventListener("click", event => {
    if (event.target.closest("#openGoogleNavigation")) { const url = navigationUrl(); if (!url) return toast("No mapped bin locations are available for this route.", "error"); window.open(url, "_blank", "noopener"); }
  });
  const originalStartTracking = window.startTracking;
  // Existing tracking keeps storing coordinates. This listener updates the route after the browser grants GPS access.
  navigator.geolocation?.getCurrentPosition?.(() => {}, () => {});
})();
