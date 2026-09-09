(() => {
  "use strict";
  const KEY = "ecotech-dashboard-language";
  const translations = {
    en: {},
    kn: {
      "Dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", "Citizen Dashboard": "ನಾಗರಿಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", "Driver Dashboard": "ಚಾಲಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      "Citizen Portal": "ನಾಗರಿಕ ಪೋರ್ಟಲ್", "Driver Portal": "ಚಾಲಕ ಪೋರ್ಟಲ್", "Request Collection": "ಸಂಗ್ರಹಣೆಗೆ ವಿನಂತಿ",
      "Garbage Bin Map": "ಕಸದ ಬಿನ್ ನಕ್ಷೆ", "My Requests": "ನನ್ನ ವಿನಂತಿಗಳು", "Complaints": "ದೂರುಗಳು", "Notifications": "ಅಧಿಸೂಚನೆಗಳು",
      "My Profile": "ನನ್ನ ಪ್ರೊಫೈಲ್", "Support": "ಸಹಾಯ", "Home": "ಮುಖಪುಟ", "Request": "ವಿನಂತಿ", "Map": "ನಕ್ಷೆ",
      "Requests": "ವಿನಂತಿಗಳು", "Profile": "ಪ್ರೊಫೈಲ್", "My Routes": "ನನ್ನ ಮಾರ್ಗಗಳು", "Assigned Bins": "ನಿಯೋಜಿತ ಬಿನ್‌ಗಳು",
      "Live Location": "ನೇರ ಸ್ಥಳ", "Collection History": "ಸಂಗ್ರಹ ಇತಿಹಾಸ", "Report Problem": "ಸಮಸ್ಯೆ ವರದಿ", "Route": "ಮಾರ್ಗ",
      "Bins": "ಬಿನ್‌ಗಳು", "Online": "ಆನ್‌ಲೈನ್", "Driver": "ಚಾಲಕ", "Citizen": "ನಾಗರಿಕ", "Garbage Collection": "ಕಸ ಸಂಗ್ರಹಣೆ",
      "Community member": "ಸಮುದಾಯ ಸದಸ್ಯ", "Logout": "ಲಾಗ್ ಔಟ್", "Completed": "ಪೂರ್ಣಗೊಂಡಿದೆ", "Pending": "ಬಾಕಿಯಿದೆ",
      "In Progress": "ಪ್ರಗತಿಯಲ್ಲಿದೆ", "Skipped": "ಬಿಟ್ಟುಬಿಡಲಾಗಿದೆ", "Active": "ಸಕ್ರಿಯ", "Available": "ಲಭ್ಯವಿದೆ",
      "Rate service": "ಸೇವೆಯನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ", "Rate this collection": "ಈ ಸಂಗ್ರಹಣೆಯನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ",
      "Submit rating": "ಮೌಲ್ಯಮಾಪನ ಸಲ್ಲಿಸಿ", "Cancel": "ರದ್ದುಮಾಡಿ", "Save Changes": "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
      "Start Route": "ಮಾರ್ಗ ಪ್ರಾರಂಭಿಸಿ", "Mark as Collected": "ಸಂಗ್ರಹಿಸಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ", "View Details": "ವಿವರಗಳನ್ನು ನೋಡಿ",
      "No requests yet.": "ಇನ್ನೂ ಯಾವುದೇ ವಿನಂತಿಗಳಿಲ್ಲ.", "No notifications yet.": "ಇನ್ನೂ ಯಾವುದೇ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ.",
      "Collection completed successfully": "ಸಂಗ್ರಹಣೆ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ"
    },
    hi: {
      "Dashboard": "डैशबोर्ड", "Citizen Dashboard": "नागरिक डैशबोर्ड", "Driver Dashboard": "ड्राइवर डैशबोर्ड",
      "Citizen Portal": "नागरिक पोर्टल", "Driver Portal": "ड्राइवर पोर्टल", "Request Collection": "संग्रह का अनुरोध",
      "Garbage Bin Map": "कचरा बिन मानचित्र", "My Requests": "मेरे अनुरोध", "Complaints": "शिकायतें", "Notifications": "सूचनाएं",
      "My Profile": "मेरी प्रोफाइल", "Support": "सहायता", "Home": "होम", "Request": "अनुरोध", "Map": "मानचित्र",
      "Requests": "अनुरोध", "Profile": "प्रोफाइल", "My Routes": "मेरे मार्ग", "Assigned Bins": "निर्धारित बिन",
      "Live Location": "लाइव स्थान", "Collection History": "संग्रह इतिहास", "Report Problem": "समस्या रिपोर्ट करें", "Route": "मार्ग",
      "Bins": "बिन", "Online": "ऑनलाइन", "Driver": "ड्राइवर", "Citizen": "नागरिक", "Garbage Collection": "कचरा संग्रह",
      "Community member": "समुदाय सदस्य", "Logout": "लॉग आउट", "Completed": "पूर्ण", "Pending": "लंबित",
      "In Progress": "प्रगति में", "Skipped": "छोड़ा गया", "Active": "सक्रिय", "Available": "उपलब्ध",
      "Rate service": "सेवा को रेट करें", "Rate this collection": "इस संग्रह को रेट करें",
      "Submit rating": "रेटिंग भेजें", "Cancel": "रद्द करें", "Save Changes": "बदलाव सहेजें",
      "Start Route": "मार्ग शुरू करें", "Mark as Collected": "संग्रहित चिह्नित करें", "View Details": "विवरण देखें",
      "No requests yet.": "अभी कोई अनुरोध नहीं है।", "No notifications yet.": "अभी कोई सूचना नहीं है।",
      "Collection completed successfully": "संग्रह सफलतापूर्वक पूरा हुआ"
    }
  };

  let language = localStorage.getItem(KEY);
  if (!translations[language]) language = "en";

  function preserveWhitespace(source, translated) {
    const before = source.match(/^\s*/)?.[0] || "", after = source.match(/\s*$/)?.[0] || "";
    return before + translated + after;
  }

  function translateNode(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.parentElement) return;
    const tag = node.parentElement.tagName;
    if (["SCRIPT", "STYLE", "TEXTAREA", "OPTION", "CODE"].includes(tag)) return;
    if (!node.__ecoOriginal) node.__ecoOriginal = node.nodeValue;
    const original = node.__ecoOriginal, plain = original.trim();
    const translated = translations[language][plain];
    node.nodeValue = translated ? preserveWhitespace(original, translated) : original;
  }

  function applyLanguage(root = document.body) {
    if (!root) return;
    document.documentElement.lang = language === "kn" ? "kn" : language === "hi" ? "hi" : "en";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateNode);
    document.querySelectorAll("[data-i18n-title]").forEach(element => {
      const original = element.dataset.i18nTitle;
      element.title = translations[language][original] || original;
      element.setAttribute("aria-label", element.title);
    });
  }

  function addSelector() {
    if (document.querySelector("#dashboardLanguage")) return;
    const anchor = document.querySelector(".head-actions, .header-right");
    if (!anchor) return;
    const wrapper = document.createElement("label");
    wrapper.className = "dashboard-language";
    wrapper.title = "Choose language";
    wrapper.innerHTML = '<i class="fa-solid fa-language"></i><select id="dashboardLanguage" aria-label="Choose language"><option value="en">English</option><option value="kn">ಕನ್ನಡ</option><option value="hi">हिन्दी</option></select>';
    anchor.prepend(wrapper);
    const select = wrapper.querySelector("select");
    select.value = language;
    select.addEventListener("change", () => {
      language = select.value;
      localStorage.setItem(KEY, language);
      applyLanguage();
    });
    document.head.insertAdjacentHTML("beforeend", '<style>.dashboard-language{display:inline-flex;align-items:center;gap:.35rem;border:1px solid #d7e4db;border-radius:9px;background:#fff;padding:.34rem .48rem;color:#166a40;font-size:.9rem}.dashboard-language select{border:0;background:transparent;outline:0;color:#173828;font-size:.83rem;max-width:86px}@media(max-width:520px){.dashboard-language i{display:none}.dashboard-language{padding:.26rem}.dashboard-language select{max-width:64px}}</style>');
  }

  const observer = new MutationObserver(mutations => {
    if (language === "en") return;
    for (const mutation of mutations) mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) translateNode(node);
      else if (node.nodeType === Node.ELEMENT_NODE && !["SCRIPT", "STYLE"].includes(node.tagName)) applyLanguage(node);
    });
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#logout")?.setAttribute("data-i18n-title", "Logout");
    addSelector();
    applyLanguage();
    observer.observe(document.body, { childList: true, subtree: true });
  });
  window.applyDashboardLanguage = applyLanguage;
})();
