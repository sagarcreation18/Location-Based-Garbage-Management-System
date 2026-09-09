(() => {
  "use strict";
  const API = "http://localhost:5000/api";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  async function api() {
    const response = await fetch(API + "/admin/fuel-efficiency", { headers: { Authorization: "Bearer " + (localStorage.getItem("ecotech-token") || "") } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) throw new Error(body.message || "Unable to load fuel data");
    return body.data || [];
  }
  function addNav() {
    const nav = document.querySelector("#sidebar .side-nav");
    if (!nav || document.querySelector('[data-page="fuel-efficiency"]')) return;
    const link = document.createElement("a");
    link.href = "#fuel-efficiency"; link.dataset.page = "fuel-efficiency";
    link.innerHTML = '<i class="fa-solid fa-gas-pump"></i>Fuel & Efficiency';
    const reports = nav.querySelector('[data-page="reports"]');
    nav.insertBefore(link, reports || null);
  }
  function calculate(rows) {
    const drivers = new Map();
    rows.forEach(row => {
      if (!drivers.has(row.driver_id)) drivers.set(row.driver_id, { name: row.full_name, vehicle: row.vehicle_number, area: row.assigned_area, logs: [], fuel: 0, cost: 0, distance: 0, litresForDistance: 0, latest: null });
      const driver = drivers.get(row.driver_id); driver.logs.push(row); driver.fuel += Number(row.fuel_litres || 0); driver.cost += Number(row.fuel_cost || 0); driver.latest = row;
    });
    drivers.forEach(driver => driver.logs.forEach((row, index) => {
      if (!index) return;
      const previous = Number(driver.logs[index - 1].odometer_km), current = Number(row.odometer_km), distance = current - previous;
      if (distance >= 0) { driver.distance += distance; driver.litresForDistance += Number(row.fuel_litres || 0); }
    }));
    return [...drivers.values()].sort((a, b) => (b.distance / (b.litresForDistance || 1)) - (a.distance / (a.litresForDistance || 1)));
  }
  async function showPage() {
    const box = document.querySelector("#pageContent"), title = document.querySelector("#pageTitle");
    if (!box) return;
    title.textContent = "Fuel & Vehicle Efficiency";
    document.querySelectorAll("[data-page]").forEach(link => link.classList.toggle("active", link.dataset.page === "fuel-efficiency"));
    box.innerHTML = '<div class="page-intro"><h2>Fuel & Vehicle Efficiency</h2><p>Fuel entries and distance estimates recorded by drivers.</p></div><section class="card-panel" id="fuelEfficiency"><div class="text-muted p-3"><i class="fa-solid fa-spinner fa-spin me-1"></i>Loading vehicle data...</div></section>';
    try {
      const drivers = calculate(await api());
      const totalFuel = drivers.reduce((sum, driver) => sum + driver.fuel, 0), totalDistance = drivers.reduce((sum, driver) => sum + driver.distance, 0);
      const target = document.querySelector("#fuelEfficiency");
      target.innerHTML = '<div class="stats-grid mb-4"><article class="stat-card"><div class="stat-icon"><i class="fa-solid fa-gas-pump"></i></div><small>Total fuel logged</small><h3>' + totalFuel.toFixed(1) + ' L</h3></article><article class="stat-card"><div class="stat-icon"><i class="fa-solid fa-road"></i></div><small>Measured distance</small><h3>' + totalDistance.toFixed(1) + ' km</h3></article><article class="stat-card"><div class="stat-icon"><i class="fa-solid fa-gauge-high"></i></div><small>Fleet efficiency</small><h3>' + (totalFuel ? (totalDistance / totalFuel).toFixed(1) : "—") + ' km/L</h3></article></div><div class="table-responsive"><table class="data-table"><thead><tr><th>Driver / Vehicle</th><th>Fuel logged</th><th>Distance*</th><th>Efficiency*</th><th>Last odometer</th><th>Last entry</th></tr></thead><tbody>' + (drivers.length ? drivers.map(driver => '<tr><td><b>' + esc(driver.name) + '</b><br><small class="text-muted">' + esc(driver.vehicle || "No vehicle") + ' · ' + esc(driver.area || "No area") + '</small></td><td>' + driver.fuel.toFixed(1) + ' L</td><td>' + driver.distance.toFixed(1) + ' km</td><td><b>' + (driver.litresForDistance ? (driver.distance / driver.litresForDistance).toFixed(1) + ' km/L' : "Needs 2 logs") + '</b></td><td>' + Number(driver.latest.odometer_km).toLocaleString("en-IN") + ' km</td><td>' + new Date(driver.latest.logged_at).toLocaleDateString("en-IN") + '</td></tr>').join("") : '<tr><td colspan="6" class="text-center text-muted py-4">No driver fuel logs have been recorded yet.</td></tr>') + '</tbody></table></div><p class="small text-muted mt-3 mb-0">* Distance is calculated from successive odometer readings. Efficiency is an estimate: distance since the previous log divided by fuel added in the current log.</p>';
    } catch (error) { document.querySelector("#fuelEfficiency").innerHTML = '<div class="text-danger p-3">' + esc(error.message) + "</div>"; }
  }
  document.addEventListener("click", event => {
    if (!event.target.closest('[data-page="fuel-efficiency"]')) return;
    event.preventDefault(); event.stopImmediatePropagation(); showPage();
  }, true);
  window.addEventListener("load", addNav);
})();
