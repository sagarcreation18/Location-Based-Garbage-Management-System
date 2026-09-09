(() => {
  const API = "http://localhost:5000/api";
  const mapsByElement = {};
  const timers = {};
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]));
  const api = async path => {
    const response = await fetch(API + path, { headers: { Authorization: "Bearer " + localStorage.getItem("ecotech-token") } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Unable to load map data");
    return body.data || [];
  };
  const relativeTime = value => {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return "just now";
    if (seconds < 3600) return Math.floor(seconds / 60) + " min ago";
    return Math.floor(seconds / 3600) + " hr ago";
  };
  const markerIcon = (maps, kind, color) => {
    const artwork = kind === "driver"
      ? '<path fill="#fff" d="M3 8h13v9H3V8zm13 4h5l3 3v2h-8v-5zM7 21a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm13 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>'
      : '<path fill="#fff" d="M9 5h10l1 3H8l1-3zm1 4h8l-1 12H11L10 9zm-2 0h12v2H8V9zm4-6h4v2h-4V3zm0 20a2 2 0 0 1-2-2h2v2zm6 0v-2h2a2 2 0 0 1-2 2z"/>';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="' + color + '" stroke="#fff" stroke-width="2"/>' + artwork + '</svg>';
    return { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new maps.Size(42, 42), anchor: new maps.Point(21, 21) };
  };

  async function drawLiveMap(id) {
    const element = document.getElementById(id);
    if (!element || !element.isConnected) {
      if (timers[id]) { clearInterval(timers[id]); delete timers[id]; }
      return;
    }
    try {
      const [bins, drivers, maps] = await Promise.all([api("/admin/bins"), api("/admin/live-locations"), loadGoogleMaps()]);
      element.innerHTML = "";
      const firstDriver = drivers.find(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)));
      const map = new maps.Map(element, {
        center: firstDriver ? { lat: Number(firstDriver.latitude), lng: Number(firstDriver.longitude) } : { lat: 15.145, lng: 76.921 },
        zoom: firstDriver ? 15 : 13,
        mapTypeControl: true, streetViewControl: false, fullscreenControl: true, zoomControl: true
      });
      mapsByElement[id] = map;
      const info = new maps.InfoWindow();
      bins.filter(bin => bin.latitude !== null && bin.longitude !== null && bin.latitude !== "" && bin.longitude !== "").forEach(bin => {
        const marker = new maps.Marker({
          position: { lat: Number(bin.latitude), lng: Number(bin.longitude) }, map,
          icon: markerIcon(maps, "bin", bin.status === "Full" ? "#dc3545" : bin.status === "Almost Full" ? "#e4a928" : "#18a779"),
          title: bin.bin_code
        });
        marker.addListener("click", () => info.open({ map, anchor: marker, content: "<b>" + escapeHtml(bin.bin_code) + "</b><br>" + escapeHtml(bin.location) + "<br>Fill level: " + escapeHtml(bin.current_level) + "%<br>Status: " + escapeHtml(bin.status) }));
      });
      drivers.forEach(driver => {
        if (!Number.isFinite(Number(driver.latitude)) || !Number.isFinite(Number(driver.longitude))) return;
        const marker = new maps.Marker({
          position: { lat: Number(driver.latitude), lng: Number(driver.longitude) }, map,
          icon: markerIcon(maps, "driver", "#277de5"),
          title: driver.full_name
        });
        marker.addListener("click", () => info.open({ map, anchor: marker, content: "<b>" + escapeHtml(driver.full_name) + "</b><br>Vehicle: " + escapeHtml(driver.vehicle_number || "Not assigned") + "<br>Status: " + escapeHtml(driver.driver_status) + "<br>Updated: " + relativeTime(driver.recorded_at) }));
      });
      if (!bins.length && !drivers.length) {
        element.insertAdjacentHTML("beforeend", '<div class="position-absolute top-50 start-50 translate-middle bg-white border rounded shadow-sm p-3 text-center small">No recent GPS location yet.<br>Drivers appear here after tapping <b>Share Live Location</b>.</div>');
      }
    } catch (error) {
      element.innerHTML = '<div class="empty-state text-danger"><i class="fa-solid fa-map-location-dot"></i><b>Google Maps is unavailable</b><p>' + escapeHtml(error.message) + "</p></div>";
    }
  }

  window.initMap = function(id) {
    drawLiveMap(id);
    if (timers[id]) clearInterval(timers[id]);
    timers[id] = setInterval(() => drawLiveMap(id), 10000);
  };

  function setCoordinates(latitude, longitude, map, marker) {
    const latitudeInput = document.querySelector('#adminActionForm [name="latitude"]');
    const longitudeInput = document.querySelector('#adminActionForm [name="longitude"]');
    if (!latitudeInput || !longitudeInput) return marker;
    latitudeInput.value = Number(latitude).toFixed(7);
    longitudeInput.value = Number(longitude).toFixed(7);
    const position = { lat: Number(latitude), lng: Number(longitude) };
    if (marker) marker.setPosition(position);
    else marker = new google.maps.Marker({ position, map, draggable: true, title: "Selected bin location" });
    map.panTo(position);
    marker.addListener("dragend", event => { marker = setCoordinates(event.latLng.lat(), event.latLng.lng(), map, marker); });
    const hint = document.getElementById("binMapCoordinates");
    if (hint) hint.textContent = "Selected: " + position.lat.toFixed(7) + ", " + position.lng.toFixed(7);
    return marker;
  }

  async function addBinMapPicker() {
    const fields = document.getElementById("adminActionFields");
    const form = document.getElementById("adminActionForm");
    if (!fields || !form || form.dataset.action !== "bin" || document.getElementById("binMapPicker")) return;
    const latitudeInput = document.querySelector('#adminActionForm [name="latitude"]');
    const longitudeInput = document.querySelector('#adminActionForm [name="longitude"]');
    if (latitudeInput) latitudeInput.required = true;
    if (longitudeInput) longitudeInput.required = true;
    fields.insertAdjacentHTML("beforeend", '<div class="col-12" id="binMapPicker"><div class="d-flex align-items-center justify-content-between mb-2"><label class="form-label mb-0">Exact bin position *</label><button type="button" id="useCurrentBinLocation" class="btn btn-outline-success btn-sm"><i class="fa-solid fa-crosshairs me-1"></i>Use my location</button></div><div id="binPickerMap" class="border rounded" style="height:260px"></div><small id="binMapCoordinates" class="text-muted d-block mt-2">Click the map or use your current location to set the latitude and longitude.</small></div>');
    try {
      const maps = await loadGoogleMaps();
      const map = new maps.Map(document.getElementById("binPickerMap"), { center: { lat: 15.145, lng: 76.921 }, zoom: 13, mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
      let marker;
      map.addListener("click", event => { marker = setCoordinates(event.latLng.lat(), event.latLng.lng(), map, marker); });
      document.getElementById("useCurrentBinLocation").addEventListener("click", () => {
        if (!navigator.geolocation) { window.toast?.("GPS is not supported in this browser.", "error"); return; }
        const button = document.getElementById("useCurrentBinLocation");
        button.disabled = true; button.textContent = "Locating...";
        navigator.geolocation.getCurrentPosition(position => {
          marker = setCoordinates(position.coords.latitude, position.coords.longitude, map, marker);
          map.setZoom(17); button.disabled = false; button.innerHTML = '<i class="fa-solid fa-crosshairs me-1"></i>Use my location';
        }, () => {
          button.disabled = false; button.innerHTML = '<i class="fa-solid fa-crosshairs me-1"></i>Use my location';
          window.toast?.("Location permission was not granted. Select a position on the map instead.", "error");
        }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      });
    } catch (error) {
      document.getElementById("binPickerMap").innerHTML = '<div class="p-3 text-danger small">' + escapeHtml(error.message) + "</div>";
    }
  }
  document.addEventListener("click", event => {
    if (event.target.closest("#openAddBin")) setTimeout(addBinMapPicker, 150);
  });
})();