(() => {
  "use strict";
  const root = document.querySelector("#pageContent") || document.querySelector("#content");
  if (!root) return;
  const selector = ".stat, .stat-card, .card, .card-panel, .chart-box, .table-responsive";
  function animate() {
    [...root.querySelectorAll(selector)].forEach((item, index) => {
      item.classList.remove("user-motion-in");
      void item.offsetWidth;
      item.style.setProperty("--motion-delay", Math.min(index, 8) * 55 + "ms");
      item.classList.add("user-motion-in");
    });
    root.querySelectorAll("tbody tr").forEach((row, index) => {
      row.style.setProperty("--row-delay", Math.min(index, 12) * 28 + "ms");
      row.classList.add("user-row-in");
    });
  }
  document.addEventListener("click", event => {
    const button = event.target.closest(".primary, .secondary, .action, .quick button, .btn");
    if (!button) return;
    button.classList.remove("user-press");
    void button.offsetWidth;
    button.classList.add("user-press");
  });
  let timer;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(animate, 35);
  }).observe(root, { childList: true, subtree: false });
  window.addEventListener("load", () => setTimeout(animate, 180));
  document.head.insertAdjacentHTML("beforeend", '<style>@media (prefers-reduced-motion:no-preference){#pageContent .user-motion-in,#content .user-motion-in{animation:userEnter .46s cubic-bezier(.2,.8,.25,1) both;animation-delay:var(--motion-delay,0ms)}#pageContent .user-row-in,#content .user-row-in{animation:userRow .32s ease both;animation-delay:var(--row-delay,0ms)}#pageContent .card,#content .card{transition:transform .2s ease,box-shadow .2s ease}#pageContent .stat:hover,#content .stat:hover{transform:translateY(-4px);box-shadow:0 12px 26px rgba(20,91,58,.12)}.user-press{animation:userPress .25s ease}@keyframes userEnter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes userRow{from{opacity:0;transform:translateX(-7px)}to{opacity:1;transform:translateX(0)}}@keyframes userPress{50%{transform:scale(.96)}}}</style>');
})();

(() => {
  "use strict";
  const pageRoot = document.querySelector("#pageContent");
  if (!pageRoot) return;

  function addPickerStyle() {
    if (document.getElementById("complaint-map-picker-style")) return;
    document.head.insertAdjacentHTML("beforeend", `<style id="complaint-map-picker-style">
      .complaint-map-picker{margin:0 0 1rem;padding:1rem;border:1px solid #dcebe3;border-radius:14px;background:#f7fcf8}.complaint-map-picker__head{display:flex;justify-content:space-between;gap:.75rem;align-items:flex-start;margin-bottom:.7rem}.complaint-map-picker h4{font-size:.95rem;margin:0;color:#175d3e}.complaint-map-picker p{margin:.2rem 0 0;color:#688077;font-size:.82rem}.complaint-map-picker button{border:1px solid #b6dbc8;border-radius:9px;background:#fff;color:#176b47;font-size:.8rem;font-weight:700;padding:.46rem .65rem;white-space:nowrap}.complaint-map-picker__map{height:250px;border-radius:10px;overflow:hidden;background:#e8f2eb}.complaint-map-picker__selected{display:block;margin-top:.65rem;color:#3f6551;font-size:.8rem}.complaint-map-picker__selected i{color:#178455;margin-right:.35rem}@media(max-width:600px){.complaint-map-picker{padding:.75rem}.complaint-map-picker__head{align-items:center}.complaint-map-picker__map{height:220px}.complaint-map-picker button{font-size:.75rem}}</style>`);
  }

  function initComplaintLocationPicker() {
    const form = document.querySelector("#complaintForm");
    const input = document.querySelector("#complaintLocation");
    if (!form || !input || form.dataset.mapPickerReady) return;
    form.dataset.mapPickerReady = "true";
    addPickerStyle();
    const label = input.previousElementSibling;
    if (!label) return;
    label.insertAdjacentHTML("beforebegin", `<section class="complaint-map-picker"><div class="complaint-map-picker__head"><div><h4><i class="fa-solid fa-map-location-dot"></i> Select issue location on map</h4><p>Tap the exact place where the issue is happening.</p></div><button type="button" id="complaintUseLocation"><i class="fa-solid fa-crosshairs"></i> Use my location</button></div><div id="complaintLocationMap" class="complaint-map-picker__map" aria-label="Complaint location map"></div><small id="complaintLocationSelected" class="complaint-map-picker__selected">Tap the map to select a location.</small></section>`);
    const mapElement = document.querySelector("#complaintLocationMap");
    const selected = document.querySelector("#complaintLocationSelected");
    const locate = document.querySelector("#complaintUseLocation");
    let mapInstance, marker, geocoder;

    const setLocation = async position => {
      const lat = Number(position.lat), lng = Number(position.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (!marker) marker = new google.maps.Marker({ map: mapInstance, position });
      else marker.setPosition(position);
      mapInstance.panTo(position);
      input.dataset.latitude = lat.toFixed(6);
      input.dataset.longitude = lng.toFixed(6);
      selected.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Finding address...`;
      try {
        const result = await new Promise((resolve, reject) => geocoder.geocode({ location: position }, (items, status) => status === "OK" && items[0] ? resolve(items[0]) : reject(new Error(status))));
        input.value = result.formatted_address;
        selected.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${result.formatted_address}`;
      } catch {
        const coordinates = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        input.value = coordinates;
        selected.innerHTML = `<i class="fa-solid fa-circle-check"></i> Selected coordinates: ${coordinates}`;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    loadGoogleMaps().then(maps => {
      mapInstance = new maps.Map(mapElement, { center: { lat: 15.145, lng: 76.921 }, zoom: 14, mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
      geocoder = new maps.Geocoder();
      mapInstance.addListener("click", event => setLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() }));
      locate.addEventListener("click", () => {
        if (!navigator.geolocation) { selected.textContent = "Location is not supported on this device. Tap the map instead."; return; }
        locate.disabled = true;
        selected.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Getting your current location...`;
        navigator.geolocation.getCurrentPosition(position => {
          locate.disabled = false;
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        }, () => {
          locate.disabled = false;
          selected.textContent = "Location permission was not granted. Tap the map to select a location.";
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
      });
    }).catch(error => {
      mapElement.innerHTML = `<div class="empty"><i class="fa-solid fa-map-location-dot"></i><b>Map unavailable</b><p>${String(error.message || "Please enter the location manually.")}</p></div>`;
      selected.textContent = "You can still type the location below.";
    });
  }

  new MutationObserver(() => setTimeout(initComplaintLocationPicker, 0)).observe(pageRoot, { childList: true });
  window.addEventListener("load", () => setTimeout(initComplaintLocationPicker, 200));
})();

(() => {
  "use strict";
  const logo = document.querySelector(".sidebar > .brand > i, .sidebar > .brand > span");
  if (!logo || document.getElementById("ecosmart-user-logo-motion")) return;
  logo.classList.add("ecosmart-logo-motion");
  const leaf = logo.querySelector("i");
  if (leaf) leaf.classList.add("ecosmart-logo-leaf");
  document.head.insertAdjacentHTML("beforeend", `<style id="ecosmart-user-logo-motion">
    @media (prefers-reduced-motion:no-preference){
      .ecosmart-logo-motion{position:relative;isolation:isolate;animation:ecosmartLogoFloat 3.6s ease-in-out infinite;box-shadow:0 8px 18px rgba(21,118,72,.25)}
      .ecosmart-logo-motion::after{content:"";position:absolute;inset:-5px;border:1px solid rgba(87,200,127,.34);border-radius:inherit;z-index:-1;animation:ecosmartLogoGlow 2.8s ease-in-out infinite}
      .ecosmart-logo-leaf{display:inline-block;transform-origin:50% 90%;animation:ecosmartLeafSway 2.4s ease-in-out infinite}
      @keyframes ecosmartLogoFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-5px) rotate(2deg)}}
      @keyframes ecosmartLogoGlow{0%,100%{opacity:.35;transform:scale(.94)}50%{opacity:1;transform:scale(1.1)}}
      @keyframes ecosmartLeafSway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(7deg)}}
    }
  </style>`);
})();
