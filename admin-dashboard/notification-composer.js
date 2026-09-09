(() => {
  const API = "http://localhost:5000/api";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  async function request(path, options = {}) {
    const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("ecotech-token"), ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Request failed");
    return body;
  }
  async function loadRecent() {
    try {
      const result = await request("/admin/notifications");
      const rows = result.data || [];
      const box = document.querySelector("#notificationHistory");
      if (!box) return;
      box.innerHTML = rows.length ? rows.slice(0, 12).map(item => `<div class="notify-item py-3"><i class="fa-solid ${item.type === "success" ? "fa-circle-check" : item.type === "warning" || item.type === "urgent" ? "fa-triangle-exclamation" : "fa-bell"}" style="color:${item.type === "success" ? "#10a779" : item.type === "warning" || item.type === "urgent" ? "#d58b20" : "#277de5"}"></i><div class="flex-grow-1"><p>${esc(item.message)}</p><small>Delivered to ${esc(item.full_name || "recipient")} · ${new Date(item.created_at).toLocaleString("en-IN")}</small></div></div>`).join("") : '<div class="empty-state"><b>No notifications sent yet.</b></div>';
    } catch (error) { const box = document.querySelector("#notificationHistory"); if (box) box.innerHTML = `<div class="text-danger p-3">${esc(error.message)}</div>`; }
  }
  window.renderNotifications = function () {
    setTimeout(loadRecent, 0);
    return '<div class="page-intro"><h2>Send Notifications</h2><p>Send an update to Drivers, Citizens, or everyone at once.</p></div><section class="card-panel mb-4"><form id="broadcastNotificationForm"><div class="row g-3"><div class="col-md-5"><label class="form-label">Send to *</label><select class="form-select" id="notificationAudience" required><option value="drivers">Drivers only</option><option value="citizens">Citizens only</option><option value="all">Drivers and Citizens</option></select><small class="text-muted d-block mt-2">Each active account receives a private in-app notification.</small></div><div class="col-md-3"><label class="form-label">Notification type</label><select class="form-select" id="notificationType"><option value="info">Information</option><option value="success">Success</option><option value="warning">Warning</option><option value="urgent">Urgent</option></select></div><div class="col-md-4"><label class="form-label">Delivery</label><div class="border rounded p-2 text-muted small h-100 d-flex align-items-center"><i class="fa-solid fa-bell me-2 text-success"></i>Shown in the recipient dashboard and Notifications page.</div></div><div class="col-12"><label class="form-label">Message *</label><textarea class="form-control" id="notificationMessage" rows="4" minlength="3" maxlength="500" required placeholder="Example: Heavy rain is expected today. Collection in Ward 5 may be delayed."></textarea><div class="d-flex justify-content-between mt-1"><small class="text-muted">Maximum 500 characters</small><small class="text-muted" id="notificationCharacters">0 / 500</small></div></div><div class="col-12 d-flex justify-content-end"><button class="primary-action" type="submit"><i class="fa-solid fa-paper-plane me-1"></i>Send Notification</button></div></div></form></section><section class="card-panel"><div class="card-head"><div><h3>Recent Delivery History</h3><p>Latest notification records across all accounts.</p></div></div><div id="notificationHistory"><div class="text-muted p-3">Loading delivery history...</div></div></section>';
  };
  document.addEventListener("input", event => { if (event.target.id === "notificationMessage") { const count = document.querySelector("#notificationCharacters"); if (count) count.textContent = `${event.target.value.length} / 500`; } });
  document.addEventListener("submit", async event => {
    if (event.target.id !== "broadcastNotificationForm") return;
    event.preventDefault();
    const form = event.target, button = form.querySelector("[type=submit]");
    if (!form.checkValidity()) { form.classList.add("was-validated"); return; }
    button.disabled = true;
    try {
      const result = await request("/admin/notifications/broadcast", { method: "POST", body: JSON.stringify({ audience: document.querySelector("#notificationAudience").value, type: document.querySelector("#notificationType").value, message: document.querySelector("#notificationMessage").value.trim() }) });
      window.toast?.(result.message, "success"); form.reset(); document.querySelector("#notificationCharacters").textContent = "0 / 500"; loadRecent();
    } catch (error) { window.toast?.(error.message, "danger"); } finally { button.disabled = false; }
  });
})();
