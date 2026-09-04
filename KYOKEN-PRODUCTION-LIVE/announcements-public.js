(function () {

    const tab = document.getElementById("announcementTab");
    const drawer = document.getElementById("announcementDrawer");
    const closeButton = document.getElementById("announcementDrawerClose");
    const backdrop = document.getElementById("announcementBackdrop");
    const container = document.getElementById("publicAnnouncements");

    if (!tab || !drawer || !container) return;

    const escapeHtml = value => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    function formatTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function cleanWebsiteMessage(value) {
        return String(value ?? "")
            // Remove Discord's raw mention syntax if an older announcement stored it.
            .replace(/<@!?(\d{17,20})>/g, "")
            .replace(/<@&(\d{17,20})>/g, "")
            .replace(/<#(\d{17,20})>/g, "")
            // The website is intentionally presentation-only: don't show mention markers.
            .replace(/(^|\s)@(?=\S)/g, "$1")
            .replace(/(^|\s)#(?=\S)/g, "$1")
            .replace(/[ \t]{2,}/g, " ")
            .replace(/\n[ \t]+/g, "\n")
            .trim();
    }

    function render(items) {
        if (!Array.isArray(items) || !items.length) {
            container.innerHTML = `
                <div class="public-announcement-empty">
                    No announcements available.
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => `
            <article class="public-announcement-card">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(cleanWebsiteMessage(item.content))}</p>
                <div class="public-announcement-footer">
                    <span>Posted by ${escapeHtml(item.author_username || "Kyōken Command")}</span>
                    <time
                        class="public-announcement-time"
                        datetime="${escapeHtml(item.created_at)}">
                        ${escapeHtml(formatTime(item.created_at))}
                    </time>
                </div>
            </article>
        `).join("");
    }

    async function load() {
        try {
            const response = await fetch("/api/announcements/public", {
                headers: { Accept: "application/json" },
                cache: "no-store"
            });

            const data = await response.json();
            if (!response.ok) throw Error(data.error || "Unable to load announcements.");

            render(data.announcements);
        } catch (error) {
            console.error("Kyōken public announcements failed:", error);
            container.innerHTML = `
                <div class="public-announcement-empty">
                    ANNOUNCEMENTS ARE CURRENTLY UNAVAILABLE.
                </div>
            `;
        }
    }

    function setOpen(open) {
        drawer.classList.toggle("is-open", open);
        backdrop?.classList.toggle("is-visible", open);
        document.body.classList.toggle("announcement-drawer-open", open);
        tab.classList.toggle("is-open", open);
        tab.setAttribute("aria-expanded", String(open));
        drawer.setAttribute("aria-hidden", String(!open));
        backdrop?.setAttribute("aria-hidden", String(!open));

        if (open) load();
    }

    tab.addEventListener("click", () => {
        setOpen(!drawer.classList.contains("is-open"));
    });

    closeButton?.addEventListener("click", () => setOpen(false));
    backdrop?.addEventListener("click", () => setOpen(false));

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && drawer.classList.contains("is-open")) {
            setOpen(false);
        }
    });

    setOpen(false);
    load();
    setInterval(load, 30000);

})();
