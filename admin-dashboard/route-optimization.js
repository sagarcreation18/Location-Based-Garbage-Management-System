(() => {
  "use strict";
  const API = "http://localhost:5000/api";
  const state = { preview: null, previewKey: "" };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const token = () => localStorage.getItem("ecotech-token") || "";
  const toast = (message, type = "success") => typeof window.toast === "function" ? window.toast(message, type) : alert(message);

  async function api(path, options = {}) {
    const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token(), ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) throw new Error(body.message || "Request failed");
    return body.data || [];
  }

  const validPoint = item => Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude));
  const point = item => ({ lat: Number(item.latitude), lng: Number(item.longitude) });
  const radians = degrees => degrees * Math.PI / 180;
  function distanceKm(from, to) {
    const radius = 6371, dLat = radians(to.lat - from.lat), dLng = radians(to.lng - from.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function priorityBand(bin) {
    const priority = String(bin.priority || "").toLowerCase(), status = String(bin.status || "").toLowerCase(), level = Number(bin.current_level || 0);
    if (priority === "urgent" || status === "full" || level >= 90) return 3;
    if (priority === "high" || status === "almost full" || level >= 70) return 2;
    return 1;
  }
  const priorityLabel = band => band === 3 ? "Urgent / full first" : band === 2 ? "High priority" : "Standard priority";

  function selectedIds() {
    return [...document.querySelectorAll("#routeBinList [data-route-bin] input:checked")]
      .map(input => Number(input.closest("[data-route-bin]")?.dataset.routeBin)).filter(Number.isInteger);
  }

  function startPoint(driverId, locations, bins) {
    const live = locations.find(item => String(item.driver_id) === String(driverId) && validPoint(item));
    if (live) return { point: point(live), label: "driver's current live location" };
    const first = bins.find(validPoint);
    return first ? { point: point(first), label: "first selected bin (no recent driver GPS)" } : null;
  }

  function optimiseStops(bins, start) {
    const remaining = bins.filter(validPoint), missing = bins.filter(bin => !validPoint(bin)), ordered = [];
    let current = start.point;
    while (remaining.length) {
      const highestPriority = Math.max(...remaining.map(priorityBand));
      const candidates = remaining.filter(bin => priorityBand(bin) === highestPriority).sort((a, b) => distanceKm(current, point(a)) - distanceKm(current, point(b)));
      const next = candidates[0];
      ordered.push(next); current = point(next); remaining.splice(remaining.indexOf(next), 1);
    }
    return [...ordered, ...missing];
  }

  function totalDistance(stops, start) {
    let total = 0, current = start.point;
    stops.filter(validPoint).forEach(stop => { total += distanceKm(current, point(stop)); current = point(stop); });
    return total;
  }

  function renderPreview(stops, start) {
    const box = document.querySelector("#routeOptimizerPreview");
    if (!box) return;
    const distance = totalDistance(stops, start);
    box.innerHTML = `<div class="route-optimizer-result"><div class="d-flex align-items-start justify-content-between gap-3 flex-wrap"><div><b><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Optimised stop order</b><p class="mb-0 small text-muted">Urgent and full bins are visited first; within each priority group, the nearest next bin is selected.</p></div><span class="badge text-bg-success">${distance.toFixed(1)} km estimate</span></div><div class="small text-muted mt-2"><i class="fa-solid fa-location-dot me-1"></i>Starting from ${esc(start.label)}. Distance is calculated locally from map coordinates; live Google traffic is not used.</div><ol class="route-stop-list mt-3 mb-0">${stops.map((bin, index) => `<li><b>Stop ${index + 1}: ${esc(bin.bin_code)}</b> <span class="text-muted">- ${esc(bin.location)}</span><span class="ms-2 badge text-bg-light">${priorityLabel(priorityBand(bin))}</span></li>`).join("")}</ol></div>`;
    document.querySelectorAll("#routeBinList [data-route-bin]").forEach(card => {
      card.querySelector(".route-stop-number")?.remove();
      const order = stops.findIndex(bin => String(bin.id) === String(card.dataset.routeBin));
      if (order >= 0) card.insertAdjacentHTML("beforeend", `<span class="route-stop-number badge text-bg-success">#${order + 1}</span>`);
    });
  }

  async function calculate({ quiet = false } = {}) {
    const ids = selectedIds(), driverId = document.querySelector("#plannerDriver")?.value;
    if (!ids.length) throw new Error("Select at least one garbage bin before optimising.");
    if (!driverId) throw new Error("Choose a driver so the route can start from their live location.");
    const [allBins, locations] = await Promise.all([api("/admin/bins"), api("/admin/live-locations").catch(() => [])]);
    const bins = ids.map(id => allBins.find(bin => Number(bin.id) === id)).filter(Boolean);
    const start = startPoint(driverId, locations, bins);
    if (!start) throw new Error("Selected bins need valid latitude and longitude before they can be optimised.");
    const ordered = optimiseStops(bins, start);
    state.preview = { bins: ordered, start };
    state.previewKey = ids.slice().sort((a, b) => a - b).join(",") + "|" + driverId;
    renderPreview(ordered, start);
    if (!quiet) toast(`Route optimised: ${ordered.length} stops ordered by priority and distance.`);
    return state.preview;
  }

  function installControls() {
    const form = document.querySelector("#routePlannerForm"), count = document.querySelector("#routeSelectedCount");
    if (!form || !count || document.querySelector("#optimiseRouteOrder")) return;
    count.insertAdjacentHTML("afterend", ' <button type="button" id="optimiseRouteOrder" class="btn btn-outline-success btn-sm ms-2"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Optimise order</button>');
    form.querySelector(".col-12.d-flex")?.insertAdjacentHTML("beforebegin", '<div class="col-12"><div id="routeOptimizerPreview" class="d-none"></div></div>');
    document.head.insertAdjacentHTML("beforeend", '<style>.route-optimizer-result{border:1px solid #b8dfc3;background:#f3fbf5;border-radius:12px;padding:1rem}.route-stop-list{padding-left:1.35rem}.route-stop-list li{padding:.24rem 0}.route-stop-number{margin-left:auto}.route-stop-list .badge{font-size:.68rem}</style>');
  }

  document.addEventListener("click", async event => {
    if (event.target.closest('[data-page="routes"]')) setTimeout(installControls, 220);
    if (event.target.closest("#optimiseRouteOrder")) {
      try {
        const box = document.querySelector("#routeOptimizerPreview");
        if (box) { box.classList.remove("d-none"); box.innerHTML = '<div class="text-muted small p-2"><i class="fa-solid fa-spinner fa-spin me-1"></i>Calculating priority and distance order...</div>'; }
        await calculate();
      } catch (error) { toast(error.message, "error"); }
    }
    if (event.target.closest("#routeBinList [data-route-bin]")) {
      state.preview = null; state.previewKey = "";
      const box = document.querySelector("#routeOptimizerPreview"); if (box) box.classList.add("d-none");
      document.querySelectorAll(".route-stop-number").forEach(item => item.remove());
    }
  });

  // This listener runs before the planner's default submit handler, ensuring the
  // persisted route_order matches the locally calculated stop order.
  document.addEventListener("submit", async event => {
    if (event.target.id !== "routePlannerForm") return;
    event.preventDefault(); event.stopImmediatePropagation();
    const submit = event.target.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      const key = selectedIds().slice().sort((a, b) => a - b).join(",") + "|" + document.querySelector("#plannerDriver").value;
      const preview = state.preview && state.previewKey === key ? state.preview : await calculate({ quiet: true });
      await api("/admin/routes", { method: "POST", body: JSON.stringify({
        route_name: document.querySelector("#plannerRouteName").value.trim(),
        area: document.querySelector("#plannerArea").value.trim(),
        driver_id: Number(document.querySelector("#plannerDriver").value),
        bin_ids: preview.bins.map(bin => Number(bin.id))
      }) });
      toast("Optimised route assigned. The ordered stops are now visible in the driver's My Routes page.");
      state.preview = null; state.previewKey = ""; window.renderPage?.("routes");
    } catch (error) { toast(error.message || "Unable to create optimised route.", "error"); }
    finally { submit.disabled = false; }
  }, true);

  window.addEventListener("load", () => setTimeout(installControls, 350));
})();
