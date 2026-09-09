(() => {
  const API = "http://localhost:5000/api";
  const labels = { bins: "garbage bin", drivers: "driver", citizens: "citizen", requests: "collection request", complaints: "complaint", routes: "route" };
  const token = () => localStorage.getItem("ecotech-token");
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  async function request(path, method = "GET") {
    const response = await fetch(API + path, { method, headers: { Authorization: "Bearer " + token() } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Delete failed");
    return data;
  }
  async function enhanceList() {
    const page = window.currentPage || document.querySelector("[data-page].active")?.dataset.page;
    if (!labels[page]) return;
    const body = document.querySelector("#liveAdminRows");
    const head = body?.closest("table")?.querySelector("thead tr");
    if (!body || !head || body.dataset.deleteReady === page) return;
    try {
      const result = await request("/admin/" + page), rows = result.data || [];
      if (!rows.length || !document.querySelector("#liveAdminRows")) return;
      if (!head.querySelector(".delete-column")) head.insertAdjacentHTML("beforeend", '<th class="delete-column">Action</th>');
      const visibleRows = [...body.querySelectorAll("tr")];
      visibleRows.forEach((tr, index) => {
        const item = rows[index];
        if (!item || tr.querySelector("[data-admin-delete]")) return;
        tr.insertAdjacentHTML("beforeend", '<td><button class="btn btn-outline-danger btn-sm" data-admin-delete="' + item.id + '" data-admin-type="' + page + '"><i class="fa-solid fa-trash"></i> Delete</button></td>');
      });
      body.dataset.deleteReady = page;
    } catch (error) { console.warn("Delete controls unavailable:", error.message); }
  }
  const observer = new MutationObserver(() => setTimeout(enhanceList, 0));
  document.addEventListener("DOMContentLoaded", () => observer.observe(document.body, { childList: true, subtree: true }));
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-admin-delete]");
    if (!button) return;
    const type = button.dataset.adminType, id = button.dataset.adminDelete, label = labels[type] || "record";
    if (!confirm("Delete this " + label + "? This cannot be undone.")) return;
    button.disabled = true;
    request("/admin/" + type + "/" + id, "DELETE").then(result => {
      if (window.toast) window.toast(result.message); else alert(result.message);
      button.closest("tr").remove();
      const body = document.querySelector("#liveAdminRows"); if (body) delete body.dataset.deleteReady;
      setTimeout(enhanceList, 50);
    }).catch(error => { button.disabled = false; if (window.toast) window.toast(error.message, "error"); else alert(error.message); });
  });
})();
