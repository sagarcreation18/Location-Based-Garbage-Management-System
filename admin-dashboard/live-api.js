/* Live Admin overview bridge. Management APIs are available under /api/admin. */
(() => {
  const token = localStorage.getItem("ecotech-token");
  const api = async path => {
    const response = await fetch(`http://localhost:5000/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) { localStorage.removeItem("ecotech-token"); localStorage.removeItem("ecotech-user"); location.href = "../index.html"; throw new Error("Admin session required"); }
    if (!response.ok) throw new Error(data.message || "Unable to load live admin data");
    return data;
  };
  window.adminApi = { get: api, put: (path, body) => fetch(`http://localhost:5000/api${path}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }).then(response => response.json()) };
  async function hydrateDashboard() {
    try {
      const me = await api("/auth/me");
      if (String(me.user.role).toLowerCase() !== "admin") throw new Error("Admin access required");
      const dashboard = await api("/admin/dashboard"); const stats = dashboard.data.stats;
      const values = [stats.totalBins, stats.activeDrivers, stats.pendingRequests, stats.openComplaints];
      document.querySelectorAll("[data-count]").forEach((element, index) => { if (values[index] !== undefined) { element.dataset.count = values[index]; element.textContent = values[index]; } });
    } catch (error) { console.warn("Live Admin data unavailable:", error.message); }
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(hydrateDashboard, 100));
})();
