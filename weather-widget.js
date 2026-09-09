(() => {
  "use strict";
  const CACHE_KEY = "ecotech-ballari-weather";
  const CACHE_MS = 10 * 60 * 1000;
  const URL = "https://api.open-meteo.com/v1/forecast?latitude=15.1394&longitude=76.9214&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FKolkata&forecast_days=1";

  const labels = {
    en: { title: "Ballari Weather", now: "Current conditions", feels: "Feels like", humidity: "Humidity", wind: "Wind", rain: "Rain chance", advisory: "Collection advisory", unavailable: "Weather data is temporarily unavailable.", refresh: "Updated now", rainAdvice: "Rain is likely today. Secure loose waste and plan collection safely.", heatAdvice: "Hot conditions expected. Keep hydrated and avoid prolonged outdoor work.", normalAdvice: "Conditions are suitable for planned collection work." },
    kn: { title: "ಬಳ್ಳಾರಿ ಹವಾಮಾನ", now: "ಪ್ರಸ್ತುತ ಪರಿಸ್ಥಿತಿ", feels: "ಅನುಭವವಾಗುವ ತಾಪಮಾನ", humidity: "ಆರ್ದ್ರತೆ", wind: "ಗಾಳಿಯ ವೇಗ", rain: "ಮಳೆಯ ಸಾಧ್ಯತೆ", advisory: "ಸಂಗ್ರಹಣೆ ಸಲಹೆ", unavailable: "ಹವಾಮಾನ ಮಾಹಿತಿ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ.", refresh: "ಈಗ ನವೀಕರಿಸಲಾಗಿದೆ", rainAdvice: "ಇಂದು ಮಳೆಯ ಸಾಧ್ಯತೆ ಇದೆ. ಸಡಿಲ ಕಸವನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಿ ಮತ್ತು ಸಂಗ್ರಹಣೆಯನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಯೋಜಿಸಿ.", heatAdvice: "ಬಿಸಿಲಿನ ಪರಿಸ್ಥಿತಿ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ. ನೀರು ಕುಡಿಯಿರಿ ಮತ್ತು ದೀರ್ಘಕಾಲ ಹೊರಗಿನ ಕೆಲಸ ತಪ್ಪಿಸಿ.", normalAdvice: "ಯೋಜಿತ ಸಂಗ್ರಹಣೆಗೆ ಪರಿಸ್ಥಿತಿಗಳು ಸೂಕ್ತವಾಗಿವೆ." },
    hi: { title: "बल्लारी मौसम", now: "वर्तमान स्थिति", feels: "महसूस तापमान", humidity: "नमी", wind: "हवा की गति", rain: "बारिश की संभावना", advisory: "संग्रह सलाह", unavailable: "मौसम की जानकारी अस्थायी रूप से उपलब्ध नहीं है।", refresh: "अभी अपडेट किया गया", rainAdvice: "आज बारिश की संभावना है। ढीले कचरे को सुरक्षित रखें और संग्रह की योजना सावधानी से बनाएं।", heatAdvice: "गर्मी की स्थिति अपेक्षित है। पर्याप्त पानी पिएं और लंबे समय तक बाहर काम से बचें।", normalAdvice: "योजनाबद्ध संग्रह कार्य के लिए परिस्थितियां उपयुक्त हैं।" }
  };

  function language() {
    const value = localStorage.getItem("ecotech-dashboard-language");
    return labels[value] ? value : "en";
  }
  function weatherInfo(code) {
    if ([0].includes(code)) return { icon: "fa-sun", text: "Clear sky" };
    if ([1, 2, 3].includes(code)) return { icon: "fa-cloud-sun", text: "Partly cloudy" };
    if ([45, 48].includes(code)) return { icon: "fa-smog", text: "Foggy" };
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: "fa-cloud-rain", text: "Drizzle" };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: "fa-cloud-showers-heavy", text: "Rain showers" };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "fa-snowflake", text: "Snow" };
    if ([95, 96, 99].includes(code)) return { icon: "fa-cloud-bolt", text: "Thunderstorm" };
    return { icon: "fa-cloud", text: "Cloudy" };
  }
  async function getWeather() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (saved && Date.now() - saved.savedAt < CACHE_MS) return saved.data;
    } catch (_) {}
    const response = await fetch(URL);
    if (!response.ok) throw new Error("Weather service unavailable");
    const data = await response.json();
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    return data;
  }
  function dashboardRoot() {
    return document.querySelector("#homeMap")?.closest("#pageContent") || document.querySelector("#routeToggle")?.closest("#content");
  }
  function renderLoading(root) {
    const widget = document.createElement("section");
    widget.className = "card weather-card";
    widget.id = "ballariWeather";
    widget.innerHTML = '<div class="weather-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading Ballari weather...</div>';
    root.insertAdjacentElement("afterbegin", widget);
    return widget;
  }
  function advice(data, copy) {
    const rain = Number(data.daily?.precipitation_probability_max?.[0] || 0);
    const code = Number(data.current?.weather_code || 0);
    if (rain >= 45 || [61,63,65,80,81,82,95,96,99].includes(code)) return copy.rainAdvice;
    if (Number(data.current?.temperature_2m || 0) >= 35) return copy.heatAdvice;
    return copy.normalAdvice;
  }
  async function mountWeather() {
    const root = dashboardRoot();
    if (!root || root.querySelector("#ballariWeather")) return;
    const widget = renderLoading(root), copy = labels[language()];
    try {
      const data = await getWeather(), current = data.current || {}, daily = data.daily || {}, info = weatherInfo(Number(current.weather_code));
      widget.innerHTML = `<div class="weather-head"><div><p class="weather-kicker"><i class="fa-solid fa-location-dot"></i> Ballari, Karnataka</p><h3>${copy.title}</h3><small>${copy.now} - ${info.text}</small></div><i class="fa-solid ${info.icon} weather-icon"></i></div><div class="weather-main"><strong>${Math.round(Number(current.temperature_2m || 0))}°C</strong><span>${copy.feels} ${Math.round(Number(current.apparent_temperature || 0))}°C</span><span>High ${Math.round(Number(daily.temperature_2m_max?.[0] || 0))}° / Low ${Math.round(Number(daily.temperature_2m_min?.[0] || 0))}°</span></div><div class="weather-metrics"><span><i class="fa-solid fa-droplet"></i>${copy.humidity}<b>${Math.round(Number(current.relative_humidity_2m || 0))}%</b></span><span><i class="fa-solid fa-wind"></i>${copy.wind}<b>${Math.round(Number(current.wind_speed_10m || 0))} km/h</b></span><span><i class="fa-solid fa-cloud-rain"></i>${copy.rain}<b>${Math.round(Number(daily.precipitation_probability_max?.[0] || 0))}%</b></span></div><div class="weather-advice"><i class="fa-solid fa-circle-info"></i><div><b>${copy.advisory}</b><p>${advice(data, copy)}</p></div></div><small class="weather-refresh"><i class="fa-solid fa-arrows-rotate"></i> ${copy.refresh}</small>`;
    } catch (_) {
      widget.innerHTML = `<div class="weather-loading text-muted"><i class="fa-solid fa-cloud-sun-rain"></i> ${copy.unavailable}</div>`;
    }
  }
  document.head.insertAdjacentHTML("beforeend", '<style>.weather-card{background:linear-gradient(120deg,#f1f8f4,#edf7ff);border:1px solid #d4e8db;margin-bottom:1rem}.weather-head{display:flex;align-items:center;justify-content:space-between}.weather-kicker{margin:0 0 .18rem;font-size:.78rem;color:#4e7060;font-weight:700}.weather-head h3{margin:0;color:#134e32}.weather-icon{font-size:2.5rem;color:#f2ac24}.weather-main{display:flex;align-items:baseline;gap:.7rem;flex-wrap:wrap;margin:.75rem 0}.weather-main strong{font-size:2.2rem;color:#145b3a}.weather-main span{color:#567367;font-size:.88rem}.weather-metrics{display:flex;gap:.6rem;flex-wrap:wrap}.weather-metrics span{background:#fff;border:1px solid #e0ece5;border-radius:8px;padding:.45rem .6rem;display:flex;gap:.35rem;align-items:center;font-size:.8rem;color:#536c60}.weather-metrics i{color:#2085bd}.weather-metrics b{color:#1e4634}.weather-advice{display:flex;gap:.55rem;margin-top:.8rem;padding:.65rem;border-radius:8px;background:#fff8df;color:#755d13;font-size:.84rem}.weather-advice p{margin:.1rem 0 0;color:#655e43}.weather-refresh{display:block;margin-top:.65rem;color:#6c8478;font-size:.72rem}.weather-loading{min-height:78px;display:flex;align-items:center;justify-content:center;gap:.5rem;color:#517161}@media(max-width:540px){.weather-main strong{font-size:1.85rem}.weather-metrics span{flex:1 1 110px}}</style>');
  const observer = new MutationObserver(() => setTimeout(mountWeather, 20));
  document.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(mountWeather, 120);
  });
})();
