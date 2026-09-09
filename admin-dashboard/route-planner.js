(() => {
  const API = "http://localhost:5000/api";
  const state = { bins: [], drivers: [], selected: new Set(), markers: new Map(), maps: null };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const notify = (message, type = "success") => typeof window.toast === "function" ? window.toast(message, type) : alert(message);
  async function api(path, options = {}) {
    const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("ecotech-token"), ...(options.headers || {}) } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Request failed");
    return result.data || [];
  }
  function markerIcon(color, active) { return { path: state.maps.SymbolPath.CIRCLE, scale: active ? 11 : 8, fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }; }
  function refreshSelection() {
    const count = state.selected.size;
    const label = document.querySelector("#routeSelectedCount");
    if (label) label.textContent = `${count} bin${count === 1 ? "" : "s"} selected`;
    document.querySelectorAll("[data-route-bin]").forEach(card => {
      const active = state.selected.has(Number(card.dataset.routeBin));
      card.classList.toggle("border-success", active); card.classList.toggle("bg-success-subtle", active); card.querySelector("input").checked = active;
    });
    state.bins.forEach(bin => { const marker = state.markers.get(bin.id); if (marker) marker.setIcon(markerIcon(state.selected.has(bin.id) ? "#198754" : bin.status === "Full" ? "#dc3545" : "#e4a928", state.selected.has(bin.id))); });
  }
  function toggleBin(id) { state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id); refreshSelection(); }
  function renderBinList() {
    const list = document.querySelector("#routeBinList"); if (!list) return;
    list.innerHTML = state.bins.length ? state.bins.map(bin => `<label class="d-flex align-items-center gap-2 p-2 mb-1 border rounded" data-route-bin="${bin.id}" style="cursor:pointer"><input type="checkbox"><span class="flex-grow-1"><b>${esc(bin.bin_code)}</b><small class="d-block text-muted">${esc(bin.location)} · ${esc(bin.current_level)}% full</small></span><span class="badge text-bg-light">${esc(bin.priority)}</span></label>`).join("") : '<div class="text-muted small p-3">Add garbage bins first, then create a route.</div>';
    list.querySelectorAll("[data-route-bin]").forEach(card => card.addEventListener("click", event => { if (event.target.tagName !== "INPUT") event.preventDefault(); toggleBin(Number(card.dataset.routeBin)); }));
    refreshSelection();
  }
  async function initialize() {
    try {
      const [bins, drivers, routes, maps] = await Promise.all([api("/admin/bins"), api("/admin/drivers"), api("/admin/routes"), loadGoogleMaps()]);
      state.bins = bins; state.drivers = drivers; state.maps = maps;
      const driver = document.querySelector("#plannerDriver");
      driver.innerHTML = '<option value="">Choose a driver</option>' + drivers.map(item => `<option value="${item.id}">${esc(item.full_name)}${item.vehicle_number ? " — " + esc(item.vehicle_number) : ""}</option>`).join("");
      renderBinList();
      const positioned = bins.filter(bin => bin.latitude !== null && bin.longitude !== null && bin.latitude !== "" && bin.longitude !== "");
      const map = new maps.Map(document.querySelector("#routePlannerMap"), { center: positioned.length ? { lat: Number(positioned[0].latitude), lng: Number(positioned[0].longitude) } : { lat: 15.145, lng: 76.921 }, zoom: positioned.length ? 13 : 12, mapTypeControl: true, streetViewControl: false, fullscreenControl: true });
      const info = new maps.InfoWindow();
      positioned.forEach(bin => {
        const marker = new maps.Marker({ position: { lat: Number(bin.latitude), lng: Number(bin.longitude) }, map, icon: markerIcon(bin.status === "Full" ? "#dc3545" : "#e4a928", false), title: bin.bin_code });
        state.markers.set(bin.id, marker);
        marker.addListener("click", () => { toggleBin(bin.id); info.open({ map, anchor: marker, content: `<b>${esc(bin.bin_code)}</b><br>${esc(bin.location)}<br>Click marker to ${state.selected.has(bin.id) ? "remove from" : "add to"} route` }); });
      });
      const rows = document.querySelector("#plannedRouteRows");
      rows.innerHTML = routes.length ? routes.map(route => `<tr><td><b>${esc(route.route_name)}</b></td><td>${esc(route.area || "-")}</td><td>${esc(route.driver_name || "Unassigned")}</td><td>${esc(route.assigned_bins)}</td><td>${esc(route.status)}</td></tr>`).join("") : '<tr><td colspan="5" class="text-center text-muted py-4">No routes created yet.</td></tr>';
    } catch (error) { const map = document.querySelector("#routePlannerMap"); if (map) map.innerHTML = `<div class="p-3 text-danger">${esc(error.message)}</div>`; notify(error.message, "error"); }
  }
  window.renderRoutes = () => {
    setTimeout(initialize, 0);
    return '<div class="page-intro"><h2>Route Planner</h2><p>Select bins on Google Maps, assign a driver, and publish the route directly to their dashboard.</p></div><section class="card-panel mb-4"><form id="routePlannerForm"><div class="row g-3"><div class="col-md-4"><label class="form-label">Route name *</label><input class="form-control" id="plannerRouteName" required placeholder="Ward 4 Morning Route"></div><div class="col-md-4"><label class="form-label">Area</label><input class="form-control" id="plannerArea" placeholder="Gandhi Nagar"></div><div class="col-md-4"><label class="form-label">Driver *</label><select class="form-select" id="plannerDriver" required><option>Loading drivers...</option></select></div><div class="col-lg-8"><div class="d-flex align-items-center justify-content-between mb-2"><b>Select bins from the map</b><span id="routeSelectedCount" class="badge text-bg-success">0 bins selected</span></div><div id="routePlannerMap" class="border rounded" style="height:420px"></div><p class="text-muted small mt-2 mb-0">Click a bin marker to add or remove it. Green markers are selected.</p></div><div class="col-lg-4"><label class="form-label">Available bins</label><div id="routeBinList" class="border rounded p-2 overflow-auto" style="height:420px"></div></div><div class="col-12 d-flex justify-content-end"><button class="primary-action" type="submit"><i class="fa-solid fa-route me-1"></i>Create and Assign Route</button></div></div></form></section><section class="card-panel"><div class="card-head"><div><h3>Created Routes</h3><p>Routes already assigned to drivers.</p></div></div><div class="table-responsive"><table class="data-table"><thead><tr><th>Route</th><th>Area</th><th>Driver</th><th>Bins</th><th>Status</th></tr></thead><tbody id="plannedRouteRows"><tr><td colspan="5" class="text-muted">Loading routes...</td></tr></tbody></table></div></section>';
  };
  document.addEventListener("submit", async event => {
    if (event.target.id !== "routePlannerForm") return;
    event.preventDefault(); const submit = event.target.querySelector("[type=submit]"); submit.disabled = true;
    try {
      await api("/admin/routes", { method: "POST", body: JSON.stringify({ route_name: document.querySelector("#plannerRouteName").value.trim(), area: document.querySelector("#plannerArea").value.trim(), driver_id: Number(document.querySelector("#plannerDriver").value), bin_ids: [...state.selected] }) });
      notify("Route assigned. It is now visible in the driver's My Routes page."); state.selected.clear(); window.renderPage?.("routes");
    } catch (error) { notify(error.message, "error"); } finally { submit.disabled = false; }
  });
})();
