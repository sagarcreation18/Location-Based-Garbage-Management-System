(() => {
  "use strict";
  const apiOrigin = location.port === "5000" ? location.origin + "/api" : location.protocol + "//" + location.hostname + ":5000/api";
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const status = value => `<span class="badge-status ${({ Available: "green", Active: "green", Completed: "green", Pending: "yellow", Assigned: "blue", "In Progress": "purple", "On Route": "purple", Cancelled: "red" })[value] || "blue"}">${escapeHtml(value || "Unknown")}</span>`;
  const request = async path => {
    const response = await fetch(apiOrigin + path, { headers: { Authorization: "Bearer " + (localStorage.getItem("ecotech-token") || "") } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) throw new Error(body.message || "Unable to load dashboard data.");
    return body.data;
  };
  const date = value => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const emptyRow = (columns, message) => `<tr><td colspan="${columns}" class="text-center text-muted py-4">${escapeHtml(message)}</td></tr>`;

  window.renderDashboard = function renderDashboard() {
    setTimeout(loadSummary, 0);
    return `<div class="welcome"><div><h2>Admin Dashboard</h2><p>Live operational data from the EcoSmart database.</p></div><span class="live-chip"><i class="fa-solid fa-circle"></i> SYSTEM LIVE</span></div>
      <div class="stats-grid">${[["fa-trash-can", "Total Garbage Bins", "summaryBins"], ["fa-truck", "Active Drivers", "summaryDrivers"], ["fa-clipboard-list", "Pending Requests", "summaryRequests"], ["fa-triangle-exclamation", "Open Complaints", "summaryComplaints"]].map(item => `<article class="stat-card"><div class="stat-icon"><i class="fa-solid ${item[0]}"></i></div><small>${item[1]}</small><h3 id="${item[2]}">—</h3><span class="trend up">Live data</span></article>`).join("")}</div>
      <div class="dashboard-grid"><section class="card-panel"><div class="card-head"><div><h3>Live Garbage Management Map</h3><p>Bins and current driver locations from the database.</p></div></div><div id="dashboardMap" class="map"></div></section><section class="card-panel"><div class="card-head"><div><h3>Garbage Bin Status</h3><p>Current capacity distribution.</p></div></div><div class="doughnut-wrap"><canvas id="statusChart"></canvas></div></section></div>
      <section class="card-panel table-card mt-4"><div class="card-head"><div><h3>Driver Performance</h3><p>Today’s collection activity and assigned bins.</p></div><button class="outline-action" data-page="drivers">Manage drivers</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Driver</th><th>Vehicle</th><th>Assigned Bins</th><th>Completed Today</th><th>Pending</th><th>Status</th></tr></thead><tbody id="driverPerformanceRows">${emptyRow(6, "Loading driver performance...")}</tbody></table></div></section>
      <section class="card-panel table-card mt-4"><div class="card-head"><div><h3>Recent Collection Requests</h3><p>Latest collection requests from citizens.</p></div><button class="outline-action" data-page="requests">View all requests</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Request ID</th><th>Citizen</th><th>Location</th><th>Request Type</th><th>Date</th><th>Status</th></tr></thead><tbody id="recentCollectionRows">${emptyRow(6, "Loading collection requests...")}</tbody></table></div></section>
      <section class="card-panel mt-4"><div class="card-head"><div><h3>Waste Collection Overview</h3><p>Waste collected during the last 7 days.</p></div></div><div class="chart-box"><canvas id="collectionChart"></canvas></div></section>`;
  };

  async function loadSummary() {
    const driverRows = document.querySelector("#driverPerformanceRows");
    const requestRows = document.querySelector("#recentCollectionRows");
    try {
      const [dashboard, drivers, bins, requests] = await Promise.all([request("/admin/dashboard"), request("/admin/drivers"), request("/admin/bins"), request("/admin/requests")]);
      const stats = dashboard.stats || {};
      const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = Number(value || 0).toLocaleString("en-IN"); };
      set("summaryBins", stats.totalBins); set("summaryDrivers", stats.activeDrivers); set("summaryRequests", stats.pendingRequests); set("summaryComplaints", stats.openComplaints);
      const assigned = bins.reduce((all, bin) => { if (bin.assigned_driver_id) all[bin.assigned_driver_id] = (all[bin.assigned_driver_id] || 0) + 1; return all; }, {});
      if (driverRows) driverRows.innerHTML = drivers.length ? drivers.slice(0, 6).map(driver => {
        const count = Number(assigned[driver.id] || 0), completed = Number(driver.today_collections || 0), pending = Math.max(0, count - completed);
        return `<tr><td><b>${escapeHtml(driver.full_name || "Driver")}</b><br><small class="text-muted">${escapeHtml(driver.assigned_area || "No assigned area")}</small></td><td>${escapeHtml(driver.vehicle_number || "Not assigned")}</td><td>${count}</td><td>${completed}</td><td>${pending}</td><td>${status(driver.driver_status)}</td></tr>`;
      }).join("") : emptyRow(6, "No drivers have been added yet.");
      if (requestRows) requestRows.innerHTML = requests.length ? requests.slice(0, 6).map(item => `<tr><td>REQ-${escapeHtml(item.id)}</td><td>${escapeHtml(item.citizen_name || "Citizen")}</td><td>${escapeHtml(item.location || item.bin_code || "Not specified")}</td><td>${escapeHtml(item.request_type || "Collection")}</td><td>${date(item.created_at)}</td><td>${status(item.status)}</td></tr>`).join("") : emptyRow(6, "No collection requests have been submitted yet.");
    } catch (error) {
      if (driverRows) driverRows.innerHTML = emptyRow(6, error.message);
      if (requestRows) requestRows.innerHTML = emptyRow(6, error.message);
    }
  }

  window.initCharts = async function initCharts() {
    const collectionCanvas = document.querySelector("#collectionChart");
    const statusCanvas = document.querySelector("#statusChart");
    if (!collectionCanvas || !statusCanvas || !window.Chart) return;
    try {
      const [dashboard, bins] = await Promise.all([request("/admin/dashboard"), request("/admin/bins")]);
      if (window.ecoCollectionChart) window.ecoCollectionChart.destroy();
      if (window.ecoStatusChart) window.ecoStatusChart.destroy();
      const waste = dashboard.wasteCollection || [];
      window.ecoCollectionChart = new Chart(collectionCanvas, { type: "bar", data: { labels: waste.length ? waste.map(item => item.day) : ["No data"], datasets: [{ label: "Waste collected (kg)", data: waste.length ? waste.map(item => Number(item.kilograms || 0)) : [0], backgroundColor: "#24a97c", borderRadius: 7 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });
      const counts = { Normal: 0, "Almost Full": 0, Full: 0, Other: 0 };
      bins.forEach(bin => { if (Object.prototype.hasOwnProperty.call(counts, bin.status)) counts[bin.status]++; else counts.Other++; });
      window.ecoStatusChart = new Chart(statusCanvas, { type: "doughnut", data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ["#18a779", "#e4ad2c", "#ec5a62", "#8b9aa8"], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { position: "bottom" } } } });
    } catch { /* The summary tables display the actionable error message. */ }
  };
})();
