(() => {
  "use strict";
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const API = "http://localhost:5000/api";
  let recognition = null, listening = false, panelOpen = false;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const toast = (message, type = "info") => typeof window.toast === "function" ? window.toast(message, type) : alert(message);
  const language = () => ({ kn: "kn-IN", hi: "hi-IN", en: "en-IN" }[localStorage.getItem("ecotech-dashboard-language")] || "en-IN");

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(text);
    message.lang = language(); message.rate = .96;
    speechSynthesis.speak(message);
  }
  function update(message, active = listening) {
    const text = document.querySelector("#voiceAssistantStatus");
    const button = document.querySelector("#voiceAssistantButton");
    if (text) text.textContent = message;
    if (button) { button.classList.toggle("listening", active); button.setAttribute("aria-pressed", String(active)); }
  }
  function openPanel() {
    panelOpen = !panelOpen;
    document.querySelector("#voiceAssistantPanel")?.classList.toggle("show", panelOpen);
  }
  function go(page) {
    const link = document.querySelector('[data-page="' + page + '"]');
    if (link) link.click();
  }
  async function nextBinNavigation() {
    const response = await fetch(API + "/driver/route/today", { headers: { Authorization: "Bearer " + (localStorage.getItem("ecotech-token") || "") } });
    const body = await response.json().catch(() => ({}));
    const bin = (body.data?.bins || []).find(item => ["Pending", "In Progress", "Normal", "Almost Full", "Full"].includes(item.status) && Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)));
    if (!bin) throw new Error("No mapped pending bin is available for navigation.");
    window.open("https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(bin.latitude + "," + bin.longitude) + "&travelmode=driving&dir_action=navigate", "_blank", "noopener");
    return "Opening navigation to the next bin.";
  }
  function clickAfterNavigation(page, selector) {
    go(page);
    setTimeout(() => document.querySelector(selector)?.click(), 650);
  }
  async function runCommand(text) {
    const command = text.toLowerCase().trim();
    update('Heard: "' + text + '"', false);
    const has = (...phrases) => phrases.some(phrase => command.includes(phrase));
    try {
      let reply = "";
      if (has("start route", "रूट शुरू", "मार्ग शुरू", "ಮಾರ್ಗ ಪ್ರಾರಂಭ")) { clickAfterNavigation("route", "#startRoute"); reply = "Starting your route."; }
      else if (has("stop route", "रूट बंद", "मार्ग बंद", "ಮಾರ್ಗ ನಿಲ್ಲ")) { const button = document.querySelector("#startRoute,#routeToggle"); button ? button.click() : clickAfterNavigation("route", "#startRoute"); reply = "Stopping your route."; }
      else if (has("share location", "location share", "लोकेशन शेयर", "ಲೊಕೇಶನ್ ಹಂಚ")) { clickAfterNavigation("location", "#shareLocation"); reply = "Turning on live location sharing."; }
      else if (has("stop sharing", "location off", "लोकेशन बंद", "ಹಂಚಿಕೆ ನಿಲ್ಲ")) { clickAfterNavigation("location", "#shareLocation"); reply = "Stopping live location sharing."; }
      else if (has("next bin", "अगला बिन", "ಮುಂದಿನ ಬಿನ್", "navigate")) reply = await nextBinNavigation();
      else if (has("my route", "show route", "मार्ग दिख", "ಮಾರ್ಗ ತೋರ")) { go("route"); reply = "Opening your route."; }
      else if (has("assigned bins", "show bins", "बिन दिख", "ಬಿನ್ ತೋರ")) { go("bins"); reply = "Opening assigned bins."; }
      else if (has("fuel", "kilometre", "kilometer", "ईंधन", "फ्यूल", "ಇಂಧನ")) { go("fuel-log"); reply = "Opening fuel and kilometre log."; }
      else if (has("report problem", "report issue", "समस्या", "ಸಮಸ್ಯೆ")) { go("problem"); reply = "Opening problem report."; }
      else if (has("mark collected", "collected", "संग्रह", "ಸಂಗ್ರಹ")) { go("bins"); reply = "Opening assigned bins. Choose the bin to mark collection with the required proof photos."; }
      else if (has("help", "commands", "मदद", "ಸಹಾಯ")) reply = "Say start route, stop route, share location, next bin, my route, assigned bins, fuel log, or report problem.";
      else reply = "I did not recognise that command. Say help to hear available commands.";
      update(reply, false); speak(reply);
    } catch (error) {
      update(error.message, false); speak(error.message);
    }
  }
  function stopListening() {
    listening = false;
    try { recognition?.stop(); } catch (_) {}
    update("Voice assistant is off.", false);
  }
  function startListening() {
    if (!Recognition) {
      update("Voice recognition is not supported in this browser. Use Chrome or Edge.", false);
      toast("Voice recognition is not supported in this browser. Use Chrome or Edge.", "error");
      return;
    }
    if (listening) return stopListening();
    recognition = new Recognition();
    recognition.lang = language(); recognition.continuous = true; recognition.interimResults = false;
    recognition.onstart = () => { listening = true; update("Listening... say a driver command.", true); };
    recognition.onresult = event => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) runCommand(result[0].transcript);
    };
    recognition.onerror = event => {
      const messages = { "not-allowed": "Microphone permission was not granted.", "no-speech": "No speech detected. Try again.", "audio-capture": "No microphone was found." };
      update(messages[event.error] || "Voice assistant could not listen.", false);
      if (event.error !== "no-speech") listening = false;
    };
    recognition.onend = () => {
      if (listening) {
        try { recognition.start(); } catch (_) {}
      } else update("Voice assistant is off.", false);
    };
    recognition.start();
  }
  function addAssistant() {
    if (document.querySelector("#voiceAssistantButton")) return;
    document.body.insertAdjacentHTML("beforeend", '<button type="button" class="voice-assistant-button" id="voiceAssistantButton" aria-label="Open driver voice assistant" aria-pressed="false"><i class="fa-solid fa-microphone"></i><span>Voice</span></button><section class="voice-assistant-panel" id="voiceAssistantPanel"><div class="voice-head"><div><b><i class="fa-solid fa-microphone-lines me-1"></i>Driver Voice Assistant</b><small id="voiceAssistantStatus">Tap Voice to start.</small></div><button type="button" id="voiceAssistantClose" aria-label="Close assistant"><i class="fa-solid fa-xmark"></i></button></div><p>Try: <b>Start route</b>, <b>Stop route</b>, <b>Share location</b>, <b>Next bin</b>, <b>Fuel log</b>, or <b>Report problem</b>.</p><small>English, Hindi, and Kannada command phrases are supported. Microphone access is used only while listening.</small></section>');
    document.querySelector("#voiceAssistantButton").addEventListener("click", () => { openPanel(); startListening(); });
    document.querySelector("#voiceAssistantClose").addEventListener("click", () => { panelOpen = false; document.querySelector("#voiceAssistantPanel")?.classList.remove("show"); stopListening(); });
  }
  document.head.insertAdjacentHTML("beforeend", '<style>.voice-assistant-button{position:fixed;right:22px;bottom:25px;z-index:1050;border:0;border-radius:999px;background:#147a48;color:#fff;padding:.72rem 1rem;display:flex;align-items:center;gap:.45rem;box-shadow:0 10px 25px rgba(17,96,57,.25);font-weight:700}.voice-assistant-button.listening{background:#d9534f;animation:voicePulse 1.25s ease infinite}.voice-assistant-panel{position:fixed;right:22px;bottom:84px;width:min(350px,calc(100vw - 34px));z-index:1050;background:#fff;border:1px solid #d9e8de;border-radius:14px;padding:1rem;box-shadow:0 15px 35px rgba(19,61,38,.18);display:none}.voice-assistant-panel.show{display:block;animation:voicePanel .2s ease both}.voice-head{display:flex;justify-content:space-between;gap:.6rem}.voice-head small{display:block;color:#668074;margin-top:.25rem}.voice-head button{border:0;background:transparent;color:#5c7267}.voice-assistant-panel p{font-size:.84rem;line-height:1.65;margin:.85rem 0 .45rem}.voice-assistant-panel>small{color:#6c8075;font-size:.73rem}@keyframes voicePulse{50%{transform:scale(1.05);box-shadow:0 0 0 8px rgba(217,83,79,.16)}}@keyframes voicePanel{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.voice-assistant-button.listening{animation:none}.voice-assistant-panel.show{animation:none}}@media(max-width:540px){.voice-assistant-button{right:15px;bottom:75px}.voice-assistant-panel{right:15px;bottom:132px}}</style>');
  window.addEventListener("load", addAssistant);
})();
