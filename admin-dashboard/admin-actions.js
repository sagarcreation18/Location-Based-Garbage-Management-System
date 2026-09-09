(() => {
  const endpoint = "http://localhost:5000/api";
  const notice = (message, type = "success") => typeof window.toast === "function" ? window.toast(message, type) : window.alert(message);
  const request = async (path, method = "GET", body) => {
    const token = localStorage.getItem("ecotech-token");
    const response = await fetch(endpoint + path, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request could not be completed");
    return data;
  };
  const modalElement = () => document.getElementById("adminActionModal");
  const openModal = () => bootstrap.Modal.getOrCreateInstance(modalElement()).show();
  const closeModal = () => bootstrap.Modal.getOrCreateInstance(modalElement()).hide();
  const setContent = (title, fields, action) => {
    document.getElementById("adminActionTitle").textContent = title;
    document.getElementById("adminActionFields").innerHTML = fields;
    document.getElementById("adminActionForm").dataset.action = action;
  };
  async function showBinForm() {
    setContent("Add Garbage Bin", `
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">Bin code *</label><input class="form-control" name="bin_code" placeholder="BIN-001" required></div>
        <div class="col-md-6"><label class="form-label">Location *</label><input class="form-control" name="location" placeholder="Ward / landmark" required></div>
        <div class="col-md-6"><label class="form-label">Latitude</label><input class="form-control" name="latitude" type="number" step="any" placeholder="15.1394"></div>
        <div class="col-md-6"><label class="form-label">Longitude</label><input class="form-control" name="longitude" type="number" step="any" placeholder="76.9214"></div>
        <div class="col-md-4"><label class="form-label">Capacity (L)</label><input class="form-control" name="capacity" type="number" min="1" value="240"></div>
        <div class="col-md-4"><label class="form-label">Current level (%)</label><input class="form-control" name="current_level" type="number" min="0" max="100" value="0"></div>
        <div class="col-md-4"><label class="form-label">Priority</label><select class="form-select" name="priority"><option value="Low">Low</option><option value="Medium" selected>Medium</option><option value="High">High</option></select></div>
        <div class="col-md-6"><label class="form-label">Type</label><select class="form-select" name="bin_type"><option value="General" selected>General</option><option value="Organic">Organic</option><option value="Recyclable">Recyclable</option></select></div>
        <div class="col-md-6"><label class="form-label">Assign driver</label><select class="form-select" name="assigned_driver_id" id="newBinDriver"><option value="">Unassigned</option></select></div>
      </div>`, "bin");
    openModal();
    try {
      const result = await request("/admin/drivers");
      const drivers = result.data || result.drivers || [];
      const select = document.getElementById("newBinDriver");
      drivers.forEach(driver => select.insertAdjacentHTML("beforeend", `<option value="${driver.id}">${driver.full_name}${driver.vehicle_number ? " - " + driver.vehicle_number : ""}</option>`));
    } catch (error) {
      notice("Driver list could not be loaded. You can still save an unassigned bin.", "warning");
    }
  }
  function showDriverForm() {
    setContent("Add Driver", `
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">Full name *</label><input class="form-control" name="full_name" required></div>
        <div class="col-md-6"><label class="form-label">Phone *</label><input class="form-control" name="phone" inputmode="tel" required></div>
        <div class="col-12"><label class="form-label">Email *</label><input class="form-control" name="email" type="email" required></div>
        <div class="col-md-6"><label class="form-label">Temporary password *</label><input class="form-control" name="password" type="password" minlength="6" required></div>
        <div class="col-md-6"><label class="form-label">Vehicle number</label><input class="form-control" name="vehicle_number" placeholder="KA-34-AB-1234"></div>
        <div class="col-md-6"><label class="form-label">License number</label><input class="form-control" name="license_number"></div>
        <div class="col-md-6"><label class="form-label">Assigned area</label><input class="form-control" name="assigned_area" placeholder="Ward 1"></div>
      </div>`, "driver");
    openModal();
  }
  document.addEventListener("click", event => {
    if (event.target.closest("#openAddBin")) showBinForm();
    if (event.target.closest("#openAddDriver")) showDriverForm();
  });
  document.addEventListener("submit", async event => {
    if (event.target.id !== "adminActionForm") return;
    event.preventDefault();
    const form = event.target;
    const values = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
      if (form.dataset.action === "bin") {
        ["latitude", "longitude", "capacity", "current_level", "assigned_driver_id"].forEach(key => {
          if (values[key] === "") delete values[key]; else values[key] = Number(values[key]);
        });
        await request("/admin/bins", "POST", values);
        notice("Garbage bin added successfully.");
        closeModal();
        window.renderPage?.("bins");
      } else if (form.dataset.action === "driver") {
        await request("/admin/drivers", "POST", values);
        notice("Driver added successfully.");
        closeModal();
        window.renderPage?.("drivers");
      }
    } catch (error) {
      notice(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
})();