(() => {
  const token = localStorage.getItem("ecotech-token");
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const request = async (path, method = "GET", body) => {
    const response = await fetch("http://localhost:5000/api" + path, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Unable to load collection proofs");
    return data;
  };
  window.renderCollectionProofs = () => {
    setTimeout(loadProofs, 20);
    return '<div class="page-intro"><h2>Collection Proofs</h2><p>Review driver photos before and after each completed collection.</p></div><section class="card-panel"><div id="collectionProofRows" class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><b>Loading proofs...</b></div></section>';
  };
  async function loadProofs() {
    const box = document.querySelector("#collectionProofRows"); if (!box) return;
    try {
      const response = await request("/admin/collection-proofs");
      box.innerHTML = response.data.length ? '<div class="row g-3">' + response.data.map(row => '<div class="col-xl-6"><article class="border rounded p-3 h-100"><div class="d-flex justify-content-between mb-2"><div><b>' + escapeHtml(row.bin_code) + ' · ' + escapeHtml(row.location) + '</b><small class="d-block text-muted">' + escapeHtml(row.driver_name) + ' · ' + new Date(row.collected_at).toLocaleString("en-IN") + '</small></div><span class="badge bg-warning text-dark">Pending review</span></div><div class="row g-2"><div class="col-6"><small class="text-muted">Before collection</small><img src="http://localhost:5000' + escapeHtml(row.before_image_path) + '" class="img-fluid rounded border" style="width:100%;height:180px;object-fit:cover"></div><div class="col-6"><small class="text-muted">After collection</small><img src="http://localhost:5000' + escapeHtml(row.after_image_path) + '" class="img-fluid rounded border" style="width:100%;height:180px;object-fit:cover"></div></div><input class="form-control form-control-sm mt-3" data-proof-note="' + row.id + '" maxlength="500" placeholder="Review note (optional)"><div class="d-flex gap-2 mt-2"><button class="btn btn-success btn-sm flex-grow-1" data-proof-status="Verified" data-proof-id="' + row.id + '">Verify clean</button><button class="btn btn-outline-danger btn-sm flex-grow-1" data-proof-status="Rejected" data-proof-id="' + row.id + '">Reject</button></div></article></div>').join("") + '</div>' : '<div class="empty-state"><i class="fa-solid fa-circle-check"></i><b>No collection proofs awaiting review.</b></div>';
    } catch (error) { box.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><b>Could not load collection proofs</b><p>' + escapeHtml(error.message) + '</p></div>'; }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const reports = document.querySelector('.sidebar [data-page="reports"]');
    if (reports && !document.querySelector('[data-page="proofs"]')) reports.insertAdjacentHTML("beforebegin", '<a href="#proofs" data-page="proofs"><i class="fa-solid fa-images"></i>Collection Proofs</a>');
  });
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-proof-status]"); if (!button) return;
    const note = document.querySelector('[data-proof-note="' + button.dataset.proofId + '"]').value;
    request("/admin/collection-proofs/" + button.dataset.proofId, "PUT", { status: button.dataset.proofStatus, note }).then(result => { toast(result.message); loadProofs(); }).catch(error => toast(error.message, "error"));
  });
})();
