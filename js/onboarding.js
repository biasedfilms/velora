const VeloraOnboarding = (() => {
    const KEY = "velora-onboarding-complete";
    const sheet = document.querySelector("#onboarding-sheet");
    const backdrop = document.querySelector("#onboarding-backdrop");
    const start = document.querySelector("#onboarding-start");
    const skip = document.querySelector("#onboarding-skip");

    function markComplete() {
        localStorage.setItem(KEY, "true");
    }

    function close() {
        sheet.hidden = true;
        backdrop.hidden = true;
        document.body.classList.remove("modal-open");
    }

    function complete() {
        markComplete();
        close();
        window.VeloraNavigation?.select("accounts");
    }

    function show() {
        if (localStorage.getItem(KEY) === "true") return;
        sheet.hidden = false;
        backdrop.hidden = false;
        document.body.classList.add("modal-open");
    }

    async function shouldShow() {
        if (localStorage.getItem(KEY) === "true") return false;
        try {
            const [accounts, transactions] = await Promise.all([
                VeloraDB.getAccounts(),
                VeloraDB.getTransactions()
            ]);
            return accounts.length === 0 && transactions.length === 0;
        } catch {
            return false;
        }
    }

    function init() {
        if (!sheet || !backdrop) return;
        start?.addEventListener("click", complete);
        skip?.addEventListener("click", () => { markComplete(); close(); });
        backdrop.addEventListener("click", () => { markComplete(); close(); });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !sheet.hidden) { markComplete(); close(); }
        });
        window.addEventListener("velora:backup-restored", () => close());
        setTimeout(async () => { if (await shouldShow()) show(); }, 500);
    }

    init();
    return { show, close };
})();
window.VeloraOnboarding = VeloraOnboarding;
