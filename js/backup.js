const VeloraBackup = (() => {
    const fileInput = document.querySelector("#backup-file-input");
    const exportButton = document.querySelector("#backup-export");
    const importButton = document.querySelector("#backup-import");
    const status = document.querySelector("#backup-status");
    const details = document.querySelector("#backup-details");

    function setStatus(message, type = "info") {
        if (!status) return;
        status.textContent = message;
        status.dataset.status = type;
        status.hidden = !message;
    }

    function getCounts(backup) {
        return [
            ["Transactions", backup.stores.transactions.length],
            ["Accounts", backup.stores.accounts.length],
            ["Categories", backup.stores.categories.length],
            ["Budgets", backup.stores.budgets.length],
            ["Recurring", backup.stores.recurringExpenses.length],
            ["Goals", backup.stores.goals.length]
        ];
    }

    function formatCounts(backup) {
        return getCounts(backup)
            .filter(([, count]) => count > 0)
            .map(([label, count]) => `${count} ${label.toLowerCase()}`)
            .join(" · ") || "No financial records";
    }

    function downloadBackup(backup) {
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = `velora-backup-${date}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    async function exportData() {
        try {
            setStatus("Preparing your backup…");
            const backup = await VeloraDB.exportBackup();
            downloadBackup(backup);
            const total = Object.values(backup.stores).reduce((sum, records) => sum + records.length, 0);
            setStatus(`Backup created successfully · ${total} records exported.`, "success");
        } catch (error) {
            console.error("[Velora] Backup export failed:", error);
            setStatus("Velora could not create the backup. Please try again.", "error");
        }
    }

    async function readBackup(file) {
        const text = await file.text();
        let backup;

        try {
            backup = JSON.parse(text);
        } catch {
            throw new Error("The selected file is not valid JSON.");
        }

        VeloraDB.validateBackup(backup);
        return backup;
    }

    async function importFile(file) {
        if (!file) return;

        try {
            setStatus("Checking backup…");
            const backup = await readBackup(file);

            details.textContent = `This backup contains ${formatCounts(backup)}.`;
            details.hidden = false;

            const confirmed = window.confirm(
                `Restore this Velora backup?\n\n${formatCounts(backup)}\n\nYour current local data will be replaced. Export a fresh backup first if you want an undo path.`
            );

            if (!confirmed) {
                setStatus("Restore cancelled.", "info");
                return;
            }

            setStatus("Restoring your data…");
            await VeloraDB.importBackup(backup);
            localStorage.setItem("velora-onboarding-complete", "true");
            window.dispatchEvent(new CustomEvent("velora:backup-restored"));

            setStatus("Restore complete. Reloading Velora…", "success");
            window.setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error("[Velora] Backup import failed:", error);
            setStatus(error.message || "Velora could not restore this backup.", "error");
        } finally {
            if (fileInput) fileInput.value = "";
        }
    }

    function init() {
        if (!fileInput || !exportButton || !importButton) return;

        exportButton.addEventListener("click", exportData);
        importButton.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", () => importFile(fileInput.files?.[0]));
    }

    return { init };
})();

window.VeloraBackup = VeloraBackup;
VeloraBackup.init();
