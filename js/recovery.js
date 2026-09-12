const VeloraRecovery = (() => {
    const dialog = document.querySelector("#data-reset-dialog");
    const backdrop = document.querySelector("#data-reset-backdrop");
    const trigger = document.querySelector("#data-reset");
    const input = document.querySelector("#data-reset-confirm");
    const message = document.querySelector("#data-reset-message");
    const confirmButton = document.querySelector("#confirm-data-reset");
    const cancelButton = document.querySelector("#cancel-data-reset");
    let returnFocus = null;

    function isConfirmed() {
        return input?.value.trim().toUpperCase() === "DELETE";
    }

    function updateButton() {
        if (!confirmButton) return;
        confirmButton.disabled = !isConfirmed();
    }

    function show() {
        if (!dialog || !backdrop || !input) return;

        returnFocus = document.activeElement;
        input.value = "";
        input.disabled = false;
        cancelButton.disabled = false;
        message.hidden = true;
        message.textContent = "";
        confirmButton.disabled = true;

        backdrop.hidden = false;
        backdrop.setAttribute("aria-hidden", "false");
        dialog.hidden = false;
        dialog.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");

        requestAnimationFrame(() => input.focus());
    }

    function close() {
        if (!dialog || !backdrop) return;

        dialog.hidden = true;
        dialog.setAttribute("aria-hidden", "true");
        backdrop.hidden = true;
        backdrop.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");

        const target = returnFocus;
        returnFocus = null;

        if (target && typeof target.focus === "function") {
            requestAnimationFrame(() => target.focus());
        }
    }

    async function confirm() {
        if (!isConfirmed()) {
            message.textContent = "Type DELETE to continue.";
            message.hidden = false;
            input.focus();
            return;
        }

        confirmButton.disabled = true;
        input.disabled = true;
        cancelButton.disabled = true;
        message.textContent = "Deleting local data…";
        message.hidden = false;

        try {
            await VeloraDB.clearAllData();
            localStorage.removeItem("velora-onboarding-complete");
            localStorage.removeItem("velora-theme");
            close();
            window.location.reload();
        } catch (error) {
            console.error("[Velora] Data reset failed:", error);
            message.textContent = "Velora could not delete the local data. Please try again.";
            confirmButton.disabled = false;
            input.disabled = false;
            cancelButton.disabled = false;
            input.focus();
        }
    }

    function trapFocus(event) {
        if (!dialog || dialog.hidden || event.key !== "Tab") return;

        const focusable = [...dialog.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )].filter((element) => element.offsetParent !== null);

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function init() {
        if (!dialog || !backdrop || !trigger || !input || !confirmButton) return;

        trigger.addEventListener("click", show);
        cancelButton?.addEventListener("click", close);
        backdrop.addEventListener("click", (event) => {
            if (event.target === backdrop) close();
        });

        input.addEventListener("input", updateButton);
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                confirm();
            }
        });

        confirmButton.addEventListener("click", confirm);

        document.addEventListener("keydown", (event) => {
            if (!dialog.hidden && event.key === "Escape") {
                event.preventDefault();
                close();
                return;
            }
            trapFocus(event);
        });
    }

    init();
    return { show, close };
})();

window.VeloraRecovery = VeloraRecovery;
