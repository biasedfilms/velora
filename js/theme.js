const VeloraTheme = (() => {
    const STORAGE_KEY = "velora-theme";
    const root = document.documentElement;
    const meta = document.querySelector("#theme-color-meta");

    function getStoredTheme() {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === "light" || value === "dark" ? value : "system";
    }

    function effectiveTheme(theme) {
        if (theme === "light" || theme === "dark") return theme;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function iconMarkup(isDark) {
        return isDark
            ? '<path d="M8.6 4.2a7.8 7.8 0 0 0 8.9 11.2 7.3 7.3 0 1 1-8.9-11.2Z"/>'
            : '<path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="3.5"/>';
    }

    function updateUI(theme) {
        const current = effectiveTheme(theme);
        const markup = iconMarkup(current === "dark");
        const label = theme === "system"
            ? `Appearance: System (${current}) — click to change`
            : `Appearance: ${current === "dark" ? "Dark" : "Light"} — click to change`;

        document.querySelectorAll("#theme-icon, #mobile-theme-icon").forEach((icon) => {
            icon.innerHTML = markup;
        });
        document.querySelectorAll("#theme-toggle, #mobile-theme-toggle").forEach((button) => {
            button.setAttribute("aria-label", label);
            button.setAttribute("title", label);
        });

        if (meta) {
            meta.setAttribute("content", current === "dark" ? "#08090b" : "#f3f4f7");
        }
    }

    function apply(theme) {
        if (theme === "light" || theme === "dark") {
            root.dataset.theme = theme;
        } else {
            delete root.dataset.theme;
        }

        window.VeloraState.theme = theme;
        updateUI(theme);
    }

    function cycle() {
        // The theme button is intentionally a simple two-state toggle.
        // This avoids the confusing System → Light → Dark → System cycle,
        // where a click can appear to do nothing when System already matches
        // the current OS appearance.
        const current = effectiveTheme(getStoredTheme());
        const next = current === "dark" ? "light" : "dark";

        localStorage.setItem(STORAGE_KEY, next);
        document.querySelectorAll("#theme-toggle, #mobile-theme-toggle").forEach((button) => {
            button.classList.remove("is-switching");
            void button.offsetWidth;
            button.classList.add("is-switching");
            window.setTimeout(() => button.classList.remove("is-switching"), 520);
        });
        apply(next);
    }

    function init() {
        apply(getStoredTheme());

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", () => {
            if (getStoredTheme() === "system") updateUI("system");
        });

        document.querySelector("#theme-toggle")?.addEventListener("click", cycle);
        document.querySelector("#mobile-theme-toggle")?.addEventListener("click", cycle);
    }

    return { init, apply, cycle };
})();

VeloraTheme.init();
