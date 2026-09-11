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
