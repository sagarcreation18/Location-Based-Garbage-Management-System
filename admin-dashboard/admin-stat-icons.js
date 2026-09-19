(() => {
    "use strict";

    const statDesigns = [
        { icon: "fa-trash-can", accent: "#10a779", tint: "#e6f8f1", label: "Total garbage bins" },
        { icon: "fa-truck", accent: "#277de5", tint: "#e9f2ff", label: "Active drivers" },
        { icon: "fa-clipboard-check", accent: "#d58b20", tint: "#fff6e3", label: "Pending requests" },
        { icon: "fa-triangle-exclamation", accent: "#e1545b", tint: "#ffedef", label: "Open complaints" }
    ];

    function addStyle() {
        if (document.getElementById("admin-stat-icons-style")) return;

        document.head.insertAdjacentHTML("beforeend", `
            <style id="admin-stat-icons-style">
                #pageContent .stat-card.admin-stat-enhanced .stat-icon {
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, .7);
                    box-shadow: 0 8px 18px rgba(28, 51, 70, .12);
                }
                #pageContent .stat-card.admin-stat-enhanced .stat-icon::after {
                    content: "";
                    position: absolute;
                    top: -15px;
                    right: -14px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, .42);
                }
                #pageContent .stat-card.admin-stat-enhanced .stat-icon i {
                    position: relative;
                    z-index: 1;
                }
            </style>
        `);
    }

    function enhanceStats() {
        const cards = [...document.querySelectorAll("#pageContent .stats-grid .stat-card")];
        if (cards.length !== statDesigns.length) return;

        addStyle();
        cards.forEach((card, index) => {
            const design = statDesigns[index];
            card.classList.add("admin-stat-enhanced");
            card.style.setProperty("--accent", design.accent);
            card.style.setProperty("--tint", design.tint);

            const icon = card.querySelector(".stat-icon");
            if (icon) {
                icon.innerHTML = `<i class="fa-solid ${design.icon}" aria-hidden="true"></i>`;
                icon.setAttribute("aria-label", design.label);
            }
        });
    }

    const pageContent = document.querySelector("#pageContent");
    if (pageContent) {
        new MutationObserver(() => window.setTimeout(enhanceStats, 0))
            .observe(pageContent, { childList: true });
    }

    window.addEventListener("load", () => window.setTimeout(enhanceStats, 200));
})();
