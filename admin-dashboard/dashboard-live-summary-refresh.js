(() => {
  "use strict";
  const API = location.port === "5000" ? location.origin + "/api" : location.protocol + "//" + location.hostname + ":5000/api";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const cls = value => ({ Available: "green", Active: "green", Completed: "green", Pending: "yellow", Assigned: "blue", "In Progress": "purple", "On Route": "purple", Cancelled: "red" })[value] || "blue";
  const badge = value => `<span class="badge-status ${cls(value)}">${esc(value || "Unknown")}</span>`;
  const row = (span, text) => `<tr><td colspan="${span}" class="text-center text-muted py-4">${esc(text)}</td></tr>`;
  const api = async path => {
    const response = await fetch(API + path, { headers: { Authorization: "Bearer " + (localStorage.getItem("ecotech-token") || "") } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) throw new Error(body.message || "Unable to load dashboard data.");
    return body.data;
  };
  const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  const when = value => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  function addStyle() {
    if (document.getElementById("live-summary-style")) return;
    document.head.insertAdjacentHTML("beforeend", `<style id="live-summary-style">
      .capacity-card{display:grid;grid-template-columns:190px 1fr;gap:14px;align-items:center;min-height:244px}.capacity-visual{height:210px;position:relative}.capacity-center{position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none}.capacity-center strong{font:700 27px Poppins;color:#173a4d}.capacity-center small{font-size:10px;color:#8292a0}.capacity-legend{display:grid;gap:10px}.capacity-legend div{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eef3f5;padding-bottom:8px;font-size:12px;color:#627386}.capacity-legend div:last-child{border:0}.capacity-legend i{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:7px}.capacity-legend b{font-size:13px;color:#253c4d}.waste-metrics{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}.waste-metric{flex:1;min-width:130px;padding:9px 11px;border:1px solid #e7efec;border-radius:10px;background:#f8fcfa}.waste-metric small{display:block;color:#7b8e98;font-size:10px}.waste-metric b{display:block;color:#176b4a;font:600 16px Poppins;margin-top:2px}@media(max-width:600px){.capacity-card{grid-template-columns:1fr}.capacity-visual{height:190px}.capacity-legend{grid-template-columns:repeat(3,1fr);gap:7px}.capacity-legend div{display:block;border:0;background:#f8fbfa;border-radius:9px;padding:8px;font-size:10px}.capacity-legend b{display:block;margin-top:4px}.waste-metric{min-width:95px}}</style>`);
  }

  window.renderDashboard = function renderDashboard() {
    addStyle(); setTimeout(loadSummary, 0);
    return `<div class="welcome"><div><h2>Admin Dashboard</h2><p>Live operational data from the EcoSmart database.</p></div><span class="live-chip"><i class="fa-solid fa-circle"></i> SYSTEM LIVE</span></div>
      <div class="stats-grid">${[["fa-trash-can", "Total Garbage Bins", "summaryBins"], ["fa-truck", "Active Drivers", "summaryDrivers"], ["fa-clipboard-list", "Pending Requests", "summaryRequests"], ["fa-triangle-exclamation", "Open Complaints", "summaryComplaints"]].map(item => `<article class="stat-card"><div class="stat-icon"><i class="fa-solid ${item[0]}"></i></div><small>${item[1]}</small><h3 id="${item[2]}">—</h3><span class="trend up">Live data</span></article>`).join("")}</div>
      <div class="dashboard-grid"><section class="card-panel"><div class="card-head"><div><h3>Live Garbage Management Map</h3><p>Bins and current driver locations from the database.</p></div></div><div id="dashboardMap" class="map"></div></section><section class="card-panel"><div class="card-head"><div><h3>Garbage Bin Status</h3><p>Current capacity distribution based on fill level.</p></div></div><div class="capacity-card"><div class="capacity-visual"><canvas id="statusChart"></canvas><div class="capacity-center"><strong id="capacityAverage">—</strong><small>average fill</small></div></div><div id="capacityLegend" class="capacity-legend"><div>Loading live capacity…</div></div></div></section></div>
      <section class="card-panel table-card mt-4"><div class="card-head"><div><h3>Driver Performance</h3><p>Today’s collection activity and assigned bins.</p></div><button class="outline-action" data-page="drivers">Manage drivers</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Driver</th><th>Vehicle</th><th>Assigned Bins</th><th>Completed Today</th><th>Pending</th><th>Status</th></tr></thead><tbody id="driverPerformanceRows">${row(6, "Loading driver performance...")}</tbody></table></div></section>
      <section class="card-panel table-card mt-4"><div class="card-head"><div><h3>Recent Collection Requests</h3><p>Latest collection requests from citizens.</p></div><button class="outline-action" data-page="requests">View all requests</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Request ID</th><th>Citizen</th><th>Location</th><th>Request Type</th><th>Date</th><th>Status</th></tr></thead><tbody id="recentCollectionRows">${row(6, "Loading collection requests...")}</tbody></table></div></section>
      <section class="card-panel mt-4"><div class="card-head"><div><h3>Waste Collection Overview</h3><p>Daily waste collected in the last 7 days.</p></div></div><div class="waste-metrics"><div class="waste-metric"><small>Total collected</small><b id="wasteTotal">—</b></div><div class="waste-metric"><small>Daily average</small><b id="wasteAverage">—</b></div><div class="waste-metric"><small>Peak day</small><b id="wastePeak">—</b></div></div><div class="chart-box"><canvas id="collectionChart"></canvas></div></section>`;
  };

  async function loadSummary() {
    const driverRows = document.querySelector("#driverPerformanceRows"), requestRows = document.querySelector("#recentCollectionRows");
    try {
      const [dashboard, drivers, bins, requests] = await Promise.all([api("/admin/dashboard"), api("/admin/drivers"), api("/admin/bins"), api("/admin/requests")]);
      const stats = dashboard.stats || {};
      set("summaryBins", Number(stats.totalBins || 0).toLocaleString("en-IN")); set("summaryDrivers", Number(stats.activeDrivers || 0).toLocaleString("en-IN")); set("summaryRequests", Number(stats.pendingRequests || 0).toLocaleString("en-IN")); set("summaryComplaints", Number(stats.openComplaints || 0).toLocaleString("en-IN"));
      const assigned = bins.reduce((counts, bin) => { if (bin.assigned_driver_id) counts[bin.assigned_driver_id] = (counts[bin.assigned_driver_id] || 0) + 1; return counts; }, {});
      if (driverRows) driverRows.innerHTML = drivers.length ? drivers.slice(0, 6).map(driver => { const assignedBins = Number(assigned[driver.id] || 0), completed = Number(driver.today_collections || 0); return `<tr><td><b>${esc(driver.full_name || "Driver")}</b><br><small class="text-muted">${esc(driver.assigned_area || "No assigned area")}</small></td><td>${esc(driver.vehicle_number || "Not assigned")}</td><td>${assignedBins}</td><td>${completed}</td><td>${Math.max(0, assignedBins - completed)}</td><td>${badge(driver.driver_status)}</td></tr>`; }).join("") : row(6, "No drivers have been added yet.");
      if (requestRows) requestRows.innerHTML = requests.length ? requests.slice(0, 6).map(item => `<tr><td>REQ-${esc(item.id)}</td><td>${esc(item.citizen_name || "Citizen")}</td><td>${esc(item.location || item.bin_code || "Not specified")}</td><td>${esc(item.request_type || "Collection")}</td><td>${when(item.created_at)}</td><td>${badge(item.status)}</td></tr>`).join("") : row(6, "No collection requests have been submitted yet.");
    } catch (error) { if (driverRows) driverRows.innerHTML = row(6, error.message); if (requestRows) requestRows.innerHTML = row(6, error.message); }
  }

  window.initCharts = async function initCharts() {
    const collectionCanvas = document.querySelector("#collectionChart"), statusCanvas = document.querySelector("#statusChart");
    if (!collectionCanvas || !statusCanvas || !window.Chart) return;
    try {
      const [dashboard, bins] = await Promise.all([api("/admin/dashboard"), api("/admin/bins")]);
      if (window.ecoCollectionChart) window.ecoCollectionChart.destroy(); if (window.ecoStatusChart) window.ecoStatusChart.destroy();
      const byDay = Object.fromEntries((dashboard.wasteCollection || []).map(item => [item.day, Number(item.kilograms || 0)]));
      const days = Array.from({ length: 7 }, (_, index) => { const current = new Date(); current.setDate(current.getDate() - (6 - index)); return current.toLocaleDateString("en-US", { weekday: "short" }); });
      const amounts = days.map(day => byDay[day] || 0), totalWaste = amounts.reduce((sum, amount) => sum + amount, 0), maximum = Math.max(...amounts), peakIndex = amounts.indexOf(maximum);
      set("wasteTotal", totalWaste.toLocaleString("en-IN") + " kg"); set("wasteAverage", (totalWaste / 7).toFixed(1) + " kg"); set("wastePeak", maximum ? days[peakIndex] + " · " + maximum + " kg" : "No collections");
      window.ecoCollectionChart = new Chart(collectionCanvas, { type: "line", data: { labels: days, datasets: [{ label: "Waste collected (kg)", data: amounts, borderColor: "#16a779", backgroundColor: "rgba(22,167,121,.14)", pointBackgroundColor: "#fff", pointBorderColor: "#16a779", pointBorderWidth: 3, pointRadius: 4, fill: true, tension: .38, borderWidth: 3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => item.raw + " kg collected" } } }, scales: { x: { grid: { display: false }, ticks: { color: "#7c8f9c" } }, y: { beginAtZero: true, grid: { color: "#edf2f3" }, ticks: { color: "#7c8f9c", callback: value => value + " kg" } } } } });
      const capacity = { Normal: 0, "Almost Full": 0, Full: 0 };
      const levels = bins.map(bin => Number(bin.current_level || 0));
      bins.forEach(bin => { const level = Number(bin.current_level || 0); if (bin.status === "Full" || level >= 90) capacity.Full++; else if (bin.status === "Almost Full" || level >= 70) capacity["Almost Full"]++; else capacity.Normal++; });
      const average = levels.length ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length) : 0, totalBins = bins.length || 1;
      set("capacityAverage", average + "%");
      const legend = document.querySelector("#capacityLegend");
      if (legend) legend.innerHTML = [["Normal", "#18a779", "below 70%"], ["Almost Full", "#e4a928", "70–89%"], ["Full", "#ec5860", "90%+"]].map(item => `<div><span><i style="background:${item[1]}"></i>${item[0]}<small class="d-block ms-3">${item[2]}</small></span><b>${capacity[item[0]]} · ${Math.round(capacity[item[0]] / totalBins * 100)}%</b></div>`).join("");
      window.ecoStatusChart = new Chart(statusCanvas, { type: "doughnut", data: { labels: Object.keys(capacity), datasets: [{ data: Object.values(capacity), backgroundColor: ["#18a779", "#e4a928", "#ec5860"], hoverOffset: 5, borderWidth: 3, borderColor: "#fff" }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "74%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => item.label + ": " + item.raw + " bin(s)" } } } } });
    } catch { set("wastePeak", "Data unavailable"); }
  };
})();
