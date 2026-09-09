(() => {
  "use strict";
  const API = "http://localhost:5000/api";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const notify = (message, type = "success") => typeof window.toast === "function" ? window.toast(message, type) : alert(message);
  async function api(path, options = {}) {
    const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", Authorization: "Bearer " + (localStorage.getItem("ecotech-token") || ""), ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) throw new Error(body.message || "Request failed");
    return body.data || [];
  }
  function addNav() {
    const nav = document.querySelector("#sidebar nav");
    if (!nav || document.querySelector('[data-page="fuel-log"]')) return;
    const history = nav.querySelector('[data-page="history"]');
    const link = document.createElement("a");
    link.href = "#fuel-log"; link.dataset.page = "fuel-log";
    link.innerHTML = '<i class="fa-solid fa-gas-pump"></i>Fuel & KM Log';
    nav.insertBefore(link, history || null);
  }
  const money = value => value == null ? "—" : "₹" + Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const date = value => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
  async function showFuelLog() {
    const content = document.querySelector("#content"), title = document.querySelector("#title");
    if (!content) return;
    title.textContent = "Fuel & Kilometre Log";
    document.querySelectorAll("[data-page]").forEach(link => link.classList.toggle("active", link.dataset.page === "fuel-log"));
    content.innerHTML = '<div class="page-title"><h2>Fuel & Kilometre Log</h2><p>Record every fuel fill-up with the current vehicle odometer.</p></div><div class="two-col"><section class="card"><div class="head"><div><h3>Add fuel entry</h3><p>Use the vehicle odometer at the time of filling fuel.</p></div></div><form id="fuelLogForm"><label class="form-label">Fuel added (litres) *</label><input id="fuelLitres" class="form-control mb-3" type="number" min="0.1" max="1000" step="0.01" required placeholder="e.g. 22.50"><label class="form-label">Odometer reading (km) *</label><input id="fuelOdometer" class="form-control mb-3" type="number" min="0" max="10000000" step="0.1" required placeholder="e.g. 15420.6"><label class="form-label">Fuel cost (optional)</label><input id="fuelCost" class="form-control mb-3" type="number" min="0" max="1000000" step="0.01" placeholder="e.g. 2200"><label class="form-label">Note (optional)</label><textarea id="fuelNote" class="form-control mb-3" maxlength="300" rows="3" placeholder="Fuel station, receipt number, or comment"></textarea><button class="primary big"><i class="fa-solid fa-floppy-disk me-2"></i>Save Fuel Log</button></form></section><section class="card"><div class="head"><div><h3>Recent fuel logs</h3><p>Your latest recorded fuel and odometer entries.</p></div></div><div id="fuelLogRows" class="text-muted">Loading fuel logs...</div></section></div>';
    try {
      const rows = await api("/driver/fuel-logs");
      const box = document.querySelector("#fuelLogRows");
      box.innerHTML = rows.length ? '<div class="table-responsive"><table class="table"><thead><tr><th>Date</th><th>Fuel</th><th>Odometer</th><th>Cost</th></tr></thead><tbody>' + rows.map(row => '<tr><td>' + date(row.logged_at) + '</td><td><b>' + Number(row.fuel_litres).toFixed(2) + ' L</b></td><td>' + Number(row.odometer_km).toLocaleString("en-IN") + ' km</td><td>' + money(row.fuel_cost) + '</td></tr>' + (row.note ? '<tr class="small text-muted"><td colspan="4">' + esc(row.note) + '</td></tr>' : "")).join("") + '</tbody></table></div>' : '<div class="empty"><i class="fa-solid fa-gas-pump"></i><b>No fuel logs yet.</b><p>Add your first fill-up above.</p></div>';
    } catch (error) { document.querySelector("#fuelLogRows").innerHTML = '<p class="text-danger">' + esc(error.message) + "</p>"; }
  }
  document.addEventListener("click", event => {
    if (!event.target.closest('[data-page="fuel-log"]')) return;
    event.preventDefault(); event.stopImmediatePropagation(); showFuelLog();
  }, true);
  document.addEventListener("submit", async event => {
    if (event.target.id !== "fuelLogForm") return;
    event.preventDefault(); event.stopImmediatePropagation();
    const button = event.target.querySelector("button"); button.disabled = true;
    try {
      await api("/driver/fuel-logs", { method: "POST", body: JSON.stringify({ fuel_litres: Number(document.querySelector("#fuelLitres").value), odometer_km: Number(document.querySelector("#fuelOdometer").value), fuel_cost: document.querySelector("#fuelCost").value, note: document.querySelector("#fuelNote").value.trim() }) });
      notify("Fuel and kilometre log saved."); showFuelLog();
    } catch (error) { notify(error.message, "error"); } finally { button.disabled = false; }
  }, true);
  window.addEventListener("load", addNav);
})();
