const VeloraNavigation = (() => {
    function getGreeting() {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return "Good morning.";
        }

        if (hour >= 12 && hour < 17) {
            return "Good afternoon.";
        }

        return "Good evening.";
    }

    const labels = {
        overview: [
            "OVERVIEW",
            getGreeting(),
            "A clear view of your money, kept private on this device."
        ],
        transactions: [
            "ACTIVITY",
            "Your transactions.",
            "Every record stays on this device."
        ],
        budgets: [
            "BUDGETS",
            "Plan with clarity.",
            "Set limits without turning finance into a chore."
        ],
        recurring: [
            "RECURRING",
            "Keep expenses predictable.",
            "Manage bills and subscriptions that repeat over time."
        ],
        accounts: [
            "ACCOUNTS",
            "Where your money lives.",
            "Keep cash, cards, wallets and savings organized."
        ],
        goals: [
            "GOALS",
            "What you're saving for.",
            "Turn plans into progress, one step at a time."
        ],
        calendar: [
            "CALENDAR",
            "Your financial timeline.",
            "See activity in context, day by day."
        ],
        insights: [
            "INSIGHTS",
            "Understand your spending.",
            "Useful signals, without a wall of charts."
        ],
        settings: [
            "SETTINGS",
            "Make Velora yours.",
            "Privacy, preferences and your local data controls."
        ]
    };

    function select(view) {
        const [eyebrow, title, subtitle] =
            labels[view] ?? labels.overview;

        document.querySelector("#page-eyebrow").textContent =
            eyebrow;

        document.querySelector("#page-title").textContent =
            view === "overview" ? getGreeting() : title;

        document.querySelector(".page-subtitle").textContent =
            subtitle;

        document.querySelectorAll("[data-view]").forEach((item) => {
            const isActive = item.dataset.view === view;
            item.classList.toggle("is-active", isActive);
            if (isActive) {
                item.setAttribute("aria-current", "page");
            } else {
                item.removeAttribute("aria-current");
            }
        });

        window.VeloraCategories?.setVisible(
            view === "settings"
        );

        window.VeloraAccounts?.setVisible(
            view === "accounts"
        );

        window.VeloraBudgets?.setVisible(
            view === "budgets"
        );

        window.VeloraRecurring?.setVisible(
            view === "recurring"
        );

        window.VeloraGoals?.setVisible(
            view === "goals"
        );

        window.VeloraCalendar?.setVisible(
            view === "calendar"
        );

        window.VeloraInsights?.setVisible(
            view === "insights"
        );

        window.VeloraActivity?.setVisible(
            view === "transactions"
        );

        const settingsPanel = document.querySelector("#settings-panel");
        if (settingsPanel) {
            settingsPanel.hidden = view !== "settings";
        }

        document.querySelectorAll(
            ".dashboard-section"
        ).forEach((section) => {
            section.hidden =
                view === "settings" ||
                view === "transactions" ||
                view === "accounts" ||
                view === "budgets" ||
                view === "recurring" ||
                view === "goals" ||
                view === "calendar" ||
                view === "insights";
        });

        window.VeloraState.view = view;

        const mainContent = document.querySelector(".main-content");
        if (mainContent) {
            mainContent.classList.remove(
                "view-overview",
                "view-transactions",
                "view-budgets",
                "view-recurring",
                "view-accounts",
                "view-goals",
                "view-calendar",
                "view-insights",
                "view-settings"
            );
            mainContent.classList.add(`view-${view}`);
        }

        const mobileMoreSheet = document.querySelector("#mobile-more-sheet");
        const mobileMoreBackdrop = document.querySelector("#mobile-more-backdrop");
        const mobileMoreToggle = document.querySelector("#mobile-more-toggle");
        const moreViews = new Set(["accounts", "goals", "insights", "settings"]);
        mobileMoreToggle?.classList.toggle("is-active", moreViews.has(view));
        if (mobileMoreSheet && !mobileMoreSheet.hidden) {
            mobileMoreSheet.hidden = true;
            if (mobileMoreBackdrop) mobileMoreBackdrop.hidden = true;
            mobileMoreToggle?.setAttribute("aria-expanded", "false");
        }

        const viewRoot = document.querySelector("#app-view");
        const topbar = document.querySelector(".topbar");
        if (topbar) {
            topbar.classList.remove("is-motion-ready");
            requestAnimationFrame(() => topbar.classList.add("is-motion-ready"));
        }

        if (viewRoot) {
            const visibleSections = Array.from(viewRoot.children)
                .filter((section) => !section.hidden);

            visibleSections.forEach((section, index) => {
                section.style.setProperty("--motion-index", index);
                section.classList.remove("motion-enter");
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => section.classList.add("motion-enter"));
                });
            });

            window.setTimeout(() => {
                visibleSections.forEach((section) => section.classList.remove("motion-enter"));
            }, 900);
        }
    }

    function init() {
        document.querySelectorAll("[data-view]").forEach((item) => {
            item.addEventListener(
                "click",
                () => select(item.dataset.view)
            );
        });

        const moreToggle = document.querySelector("#mobile-more-toggle");
        const moreSheet = document.querySelector("#mobile-more-sheet");
        const moreBackdrop = document.querySelector("#mobile-more-backdrop");
        const closeMoreButton = document.querySelector("#close-mobile-more");

        const closeMore = () => {
            if (!moreSheet) return;
            moreSheet.hidden = true;
            if (moreBackdrop) moreBackdrop.hidden = true;
            moreToggle?.setAttribute("aria-expanded", "false");
            moreToggle?.focus();
        };

        moreToggle?.addEventListener("click", () => {
            if (!moreSheet) return;
            const willOpen = moreSheet.hidden;
            moreSheet.hidden = !willOpen;
            if (moreBackdrop) moreBackdrop.hidden = !willOpen;
            moreToggle.setAttribute("aria-expanded", String(willOpen));
            if (willOpen) {
                requestAnimationFrame(() => closeMoreButton?.focus());
            }
        });

        closeMoreButton?.addEventListener("click", closeMore);
        moreBackdrop?.addEventListener("click", closeMore);
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && moreSheet && !moreSheet.hidden) {
                event.preventDefault();
                closeMore();
            }
        });

        // Render the current view immediately so the greeting always reflects
        // the user's local time on the first paint. The HTML fallback is only
        // a loading state and must never become the final greeting.
        select(window.VeloraState.view || "overview");

        // Keep the greeting accurate if the app stays open across a time
        // boundary (e.g. 11:59 → 12:00).
        setInterval(() => {
            if (window.VeloraState.view === "overview") {
                const pageTitle = document.querySelector("#page-title");
                if (pageTitle) {
                    pageTitle.textContent = getGreeting();
                }
            }
        }, 60000);
    }

    return {
        init,
        select
    };
})();

VeloraNavigation.init();