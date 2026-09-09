(() => {
  "use strict";
  const API = "http://localhost:5000/api";

  function esc(value) {
    const box = document.createElement("div");
    box.textContent = value == null ? "" : String(value);
    return box.innerHTML;
  }

  async function fetchRatings() {
    const token = localStorage.getItem("token") || "";
    const response = await fetch(API + "/admin/ratings", { headers: { Authorization: "Bearer " + token } });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.message || "Unable to load ratings.");
    return body.data || [];
  }

  function stars(value) {
    return [1, 2, 3, 4, 5].map(star => `<i class="${star <= Number(value) ? "fa-solid" : "fa-regular"} fa-star"></i>`).join("");
  }

  window.renderServiceRatings = () => `<div class="page-intro"><h2>Service Ratings</h2><p>Citizen feedback received after completed collections.</p></div><section class="card" id="serviceRatingsCard"><div class="empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading citizen feedback...</div></section>`;

  async function populateRatings() {
    const card = document.getElementById("serviceRatingsCard");
    if (!card) return;
    try {
      const ratings = await fetchRatings();
      const average = ratings.length ? (ratings.reduce((total, row) => total + Number(row.rating || 0), 0) / ratings.length).toFixed(1) : "—";
      card.innerHTML = `
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div><h3 class="mb-1">Collection feedback</h3><p class="text-muted mb-0">${ratings.length} citizen rating${ratings.length === 1 ? "" : "s"} received</p></div>
          <div class="rating-summary"><strong>${average}</strong><span class="rating-stars-view">${average === "—" ? "No ratings yet" : stars(Math.round(Number(average)))}</span></div>
        </div>
        <div class="table-wrap"><table class="table align-middle"><thead><tr><th>Citizen</th><th>Request</th><th>Collection location</th><th>Rating</th><th>Feedback</th><th>Submitted</th></tr></thead>
        <tbody>${ratings.length ? ratings.map(row => `<tr><td><b>${esc(row.citizen_name)}</b><br><small class="text-muted">${esc(row.citizen_email || "")}</small></td><td>REQ-${row.request_id}<br><small class="text-muted">${esc(row.request_type || "")}</small></td><td>${esc(row.location || "—")}</td><td><span class="rating-stars-view" aria-label="${row.rating} out of 5">${stars(row.rating)}</span><small class="ms-1">${row.rating}/5</small></td><td class="feedback-cell">${esc(row.feedback || "No written feedback")}</td><td>${row.created_at ? new Date(row.created_at).toLocaleString("en-IN", { dateStyle:"medium", timeStyle:"short" }) : "—"}</td></tr>`).join("") : `<tr><td colspan="6"><div class="empty"><i class="fa-regular fa-star"></i> No collection ratings yet.</div></td></tr>`}</tbody></table></div>`;
    } catch (error) {
      card.innerHTML = `<div class="empty text-danger"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(error.message)}</div>`;
    }
  }

  document.addEventListener("click", event => {
    if (event.target.closest('[data-page="ratings"]')) setTimeout(populateRatings, 80);
  });

  window.addEventListener("load", () => {
    const nav = document.querySelector("#sidebar .nav, #sidebar nav, .sidebar .nav");
    if (nav && !document.querySelector('[data-page="ratings"]')) {
      const link = document.createElement("a");
      link.href = "#ratings";
      link.dataset.page = "ratings";
      link.innerHTML = '<i class="fa-solid fa-star"></i><span>Service Ratings</span>';
      const reports = nav.querySelector('[data-page="reports"]');
      nav.insertBefore(link, reports || null);
    }
  });

  document.head.insertAdjacentHTML("beforeend", `<style>
    .rating-summary{min-width:135px;border:1px solid #e2eee4;background:#f6fbf7;border-radius:14px;padding:.65rem 1rem;display:flex;align-items:center;gap:.55rem}.rating-summary strong{font-size:1.8rem;color:#146c3b}.rating-stars-view{color:#f5b301;white-space:nowrap}.feedback-cell{max-width:300px;white-space:normal}
  </style>`);
})();
