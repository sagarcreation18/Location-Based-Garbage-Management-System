(() => {
  "use strict";
  function apiBase() {
    const { protocol, hostname, port, origin } = location;
    if (port === "5000") return `${origin}/api`;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:5000/api";
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname)) return `${protocol}//${hostname}:5000/api`;
    return `${origin}/api`;
  }
  const API = apiBase();
  let currentRequestId = null;
  let selectedRating = 0;

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: "Bearer " + (localStorage.getItem("token") || "")
  });

  function escRating(value) {
    const box = document.createElement("div");
    box.textContent = value == null ? "" : String(value);
    return box.innerHTML;
  }

  function createModal() {
    if (document.getElementById("collectionRatingModal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal fade" id="collectionRatingModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <form class="modal-content" id="collectionRatingForm">
            <div class="modal-header">
              <div><h5 class="modal-title">Rate this collection</h5><small class="text-muted">Your feedback helps improve the service.</small></div>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <label class="form-label fw-semibold">How was the collection service?</label>
              <div class="rating-stars" role="radiogroup" aria-label="Choose a rating">
                ${[1, 2, 3, 4, 5].map(star => `<button type="button" class="rating-star" data-rating-star="${star}" aria-label="${star} star${star > 1 ? "s" : ""}"><i class="fa-star fa-regular"></i></button>`).join("")}
              </div>
              <div id="ratingHint" class="small text-muted mt-2">Select 1 to 5 stars</div>
              <label for="ratingFeedback" class="form-label fw-semibold mt-3">Feedback <span class="text-muted fw-normal">(optional)</span></label>
              <textarea id="ratingFeedback" class="form-control" maxlength="1000" rows="4" placeholder="Tell us what went well or what we can improve."></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-success"><i class="fa-solid fa-paper-plane me-1"></i> Submit rating</button>
            </div>
          </form>
        </div>
      </div>`);
    document.head.insertAdjacentHTML("beforeend", `<style>
      .rating-stars{display:flex;gap:.45rem}.rating-star{border:0;background:transparent;color:#b9c6bd;font-size:2rem;padding:0;line-height:1;transition:transform .18s,color .18s}.rating-star:hover{transform:translateY(-2px)}.rating-star.active{color:#f5b301}.rating-action{white-space:nowrap}.rating-done{color:#16834a;font-weight:700;font-size:.82rem}.rating-done i{color:#f5b301}
    </style>`);

    document.querySelectorAll("[data-rating-star]").forEach(button => button.addEventListener("click", () => {
      selectedRating = Number(button.dataset.ratingStar);
      document.querySelectorAll("[data-rating-star]").forEach(star => {
        const active = Number(star.dataset.ratingStar) <= selectedRating;
        star.classList.toggle("active", active);
        star.querySelector("i").className = active ? "fa-solid fa-star" : "fa-regular fa-star";
      });
      document.getElementById("ratingHint").textContent = ["", "Poor", "Fair", "Good", "Very good", "Excellent"][selectedRating];
    }));

    document.getElementById("collectionRatingForm").addEventListener("submit", submitRating);
  }

  function notify(message, type) {
    if (typeof window.toast === "function") window.toast(message, type || "success");
    else alert(message);
  }

  function openRating(requestId) {
    createModal();
    currentRequestId = requestId;
    selectedRating = 0;
    document.getElementById("ratingFeedback").value = "";
    document.querySelectorAll("[data-rating-star]").forEach(star => {
      star.classList.remove("active");
      star.querySelector("i").className = "fa-regular fa-star";
    });
    document.getElementById("ratingHint").textContent = "Select 1 to 5 stars";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("collectionRatingModal")).show();
  }

  async function submitRating(event) {
    event.preventDefault();
    if (!selectedRating) return notify("Please select a star rating.", "error");
    const button = event.currentTarget.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const response = await fetch(`${API}/citizen/requests/${currentRequestId}/rating`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ rating: selectedRating, feedback: document.getElementById("ratingFeedback").value.trim() })
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || "Unable to save your rating.");
      bootstrap.Modal.getInstance(document.getElementById("collectionRatingModal"))?.hide();
      notify("Thank you for rating this collection.", "success");
      enhanceRequests();
    } catch (error) {
      notify(error.message || "Unable to save your rating.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function enhanceRequests() {
    const table = document.querySelector("#pageContent table.table");
    if (!table || !document.querySelector("#pageContent h2")?.textContent.includes("My Collection Requests")) return;
    try {
      const response = await fetch(`${API}/citizen/ratings`, { headers: authHeaders() });
      const body = await response.json();
      if (!response.ok || !body.success) return;
      const ratings = new Map((body.data || []).map(item => [String(item.request_id), item]));
      document.querySelectorAll("#pageContent tbody tr").forEach(row => {
        const idText = row.cells?.[0]?.textContent?.trim() || "";
        const requestId = idText.replace(/^REQ-/, "");
        if (!/^\d+$/.test(requestId)) return;
        const status = row.cells?.[5]?.textContent?.trim().toLowerCase() || "";
        const target = row.cells?.[6];
        if (!target || !status.includes("completed")) return;
        const saved = ratings.get(requestId);
        target.innerHTML = saved
          ? `<span class="rating-done" title="${escRating(saved.feedback || "No written feedback")}"><i class="fa-solid fa-star"></i> ${saved.rating}/5 Rated</span>`
          : `<button class="action primary rating-action" data-rate-request="${requestId}"><i class="fa-solid fa-star"></i> Rate service</button>`;
      });
    } catch (_) { /* The main requests page remains available if ratings cannot load. */ }
  }

  document.addEventListener("click", event => {
    const rate = event.target.closest("[data-rate-request]");
    if (rate) return openRating(rate.dataset.rateRequest);
    if (event.target.closest('[data-page="requests"]')) setTimeout(enhanceRequests, 180);
  });
  window.addEventListener("load", () => setTimeout(enhanceRequests, 250));
  window.enhanceCollectionRatings = enhanceRequests;
})();
