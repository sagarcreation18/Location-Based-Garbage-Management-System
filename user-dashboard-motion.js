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
