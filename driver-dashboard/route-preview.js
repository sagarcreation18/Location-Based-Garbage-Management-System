(() => {
  let previewMap;
  const routeStops = () => ((typeof bins !== "undefined" ? bins : []) || []).filter(bin => Number.isFinite(Number(bin.latitude)) && Number.isFinite(Number(bin.longitude))).map(bin => ({ lat: Number(bin.latitude), lng: Number(bin.longitude), bin }));
  const externalMapUrl = () => { const stop = routeStops()[0]; return stop ? "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(stop.lat + "," + stop.lng) + "&travelmode=driving&dir_action=navigate" : null; };

  window.routePage = async function () {
    const response = await apiGet("/driver/route/today");
    bins = response.data.bins || [];
    setTimeout(renderRoutePreviewMap, 30);
    return '<div class="page-title"><h2>My Route</h2><p>' + esc(response.data.routeName) + ' · ' + bins.length + ' assigned bin(s)</p></div><section class="card"><div class="head"><div><h3>Bin location preview</h3><p>All assigned bins are shown here before navigation starts.</p></div><button class="primary" id="startRoute"><i class="fa-solid fa-play me-1"></i>Start Route</button></div><div id="routePreviewMap" class="map large"></div><div class="alert alert-info small mt-3 mb-0"><i class="fa-solid fa-circle-info me-1"></i>Press Start Route to open Google Maps navigation to the first bin.</div></section><section class="card mt-3"><div class="head"><h3>Collection stops</h3></div>' + routeList(bins) + '</section>';
  };

  async function renderRoutePreviewMap() {
    const element = document.querySelector("#routePreviewMap"); if (!element) return;
    try {
      const maps = await loadGoogleMaps(), stops = routeStops();
      const center = stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : { lat: 15.145, lng: 76.921 };
      previewMap = new maps.Map(element, { center, zoom: stops.length ? 14 : 13, mapTypeControl: true, fullscreenControl: true, streetViewControl: false, gestureHandling: "greedy" });
      const bounds = new maps.LatLngBounds();
      stops.forEach((stop, index) => {
        const marker = new maps.Marker({ position: { lat: stop.lat, lng: stop.lng }, map: previewMap, label: { text: String(index + 1), color: "#fff", fontWeight: "700" }, icon: { path: maps.SymbolPath.CIRCLE, scale: 11, fillColor: "#e4a928", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }, title: (index + 1) + ". " + stop.bin.bin_code });
        const info = new maps.InfoWindow({ content: "<b>Stop " + (index + 1) + ": " + esc(stop.bin.bin_code) + "</b><br>" + esc(stop.bin.location) + "<br>Fill level: " + stop.bin.current_level + "%" });
        marker.addListener("click", () => info.open({ map: previewMap, anchor: marker }));
        bounds.extend(marker.getPosition());
      });
      if (stops.length > 1) previewMap.fitBounds(bounds, 45);
    } catch (error) {
      element.innerHTML = '<div class="empty"><i class="fa-solid fa-map-location-dot"></i><b>Google Maps is unavailable</b><p>' + esc(error.message) + '</p></div>';
    }
  }

  async function startRouteAndOpenMaps() {
    const mapWindow = window.open("", "_blank");
    try {
      if (profile.driver_status !== "On Route") {
        await apiPut("/driver/status", { status: "On Route" });
        profile.driver_status = "On Route";
        startTracking();
      }
      const url = externalMapUrl();
      if (!url) throw new Error("No assigned bin has a map location.");
      if (mapWindow) mapWindow.location.href = url; else window.location.href = url;
      toast("Route started. Google Maps opened for the first bin.");
      render("route");
    } catch (error) {
      if (mapWindow) mapWindow.close();
      toast(error.message, "error");
    }
  }

  document.addEventListener("click", event => {
    if (!event.target.closest("#startRoute") && !event.target.closest("#routeToggle")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startRouteAndOpenMaps();
  }, true);
})();
