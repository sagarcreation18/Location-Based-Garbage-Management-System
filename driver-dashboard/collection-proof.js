(function(){
  function proofImage(file) {
    if (!file) throw new Error("Both before and after photos are required.");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 2 * 1024 * 1024) throw new Error("Use a JPG, PNG, or WebP photo smaller than 2 MB.");
    return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Unable to read photo")); reader.readAsDataURL(file); });
  }
  function showCelebration(binCode) { const old = document.querySelector("#collectionCelebration"); if (old) old.remove(); const overlay = document.createElement("div"); overlay.id = "collectionCelebration"; overlay.innerHTML = '<div class="collection-success-card"><span class="spark"></span><span class="spark"></span><span class="spark"></span><span class="spark"></span><div class="success-ring"><i class="fa-solid fa-check"></i></div><h3>Collection completed!</h3><p>' + binCode + ' is marked collected and the proof was sent to Admin.</p></div>'; document.body.append(overlay); setTimeout(() => overlay.remove(), 2200); }
  window.openBin = async id => {
    try {
      const response = await apiGet("/driver/bins/" + id), bin = response.data;
      $("#modalTitle").textContent = bin.bin_code + " · " + bin.location;
      $("#modalBody").innerHTML = '<p class="text-muted small">Fill level: <b>' + bin.current_level + '%</b></p><label class="form-label">Waste collected (kg)</label><input class="form-control mb-3" id="waste" type="number" min="0" max="2000" value="0"><div class="alert alert-info small py-2">Before-and-after photos are required for admin verification.</div><label class="form-label small">Before collection photo</label><input class="form-control mb-3" id="beforeProof" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><label class="form-label small">After collection photo</label><input class="form-control mb-3" id="afterProof" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><button class="primary w-100" id="collect">Submit proof & collect</button>';
      modal.show();
      $("#collect").onclick = async () => {
        try {
          const button = $("#collect"); button.classList.add("is-saving"); button.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving collection...';
          const images = await Promise.all([proofImage($("#beforeProof").files[0]), proofImage($("#afterProof").files[0])]);
          await apiPut("/driver/bins/" + id + "/collect", { wasteCollected: $("#waste").value, beforeImage: images[0], afterImage: images[1] });
          modal.hide(); showCelebration(bin.bin_code); toast("Collection completed and proof sent for review."); render("dashboard");
        } catch (error) { toast(error.message, "error"); }
      };
    } catch (error) { toast(error.message, "error"); }
  };
})();
