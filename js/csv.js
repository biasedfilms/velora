const VeloraCSV = (() => {
    const button = document.querySelector("#csv-export");
    const status = document.querySelector("#backup-status");

    function escapeCell(value) {
        const text = value === null || value === undefined ? "" : String(value);
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    function setStatus(message, type = "info") {
        if (!status) return;
        status.textContent = message;
        status.dataset.status = type;
        status.hidden = !message;
    }

    function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
    }

    async function exportTransactions() {
        try {
            setStatus("Preparing your CSV export…");
            const [transactions, accounts, categories] = await Promise.all([
                VeloraDB.getTransactions(),
                VeloraDB.getAccounts(),
                VeloraDB.getCategories()
            ]);
            const accountMap = new Map(accounts.map((item) => [item.id, item.name]));
            const categoryMap = new Map(categories.map((item) => [item.id, item.name]));
            const headers = [
                "Date", "Type", "Amount", "Account", "Category", "Description", "Notes", "ID"
            ];
            const rows = transactions.map((transaction) => [
                formatDate(transaction.date),
                transaction.type || "",
                transaction.amount ?? "",
                transaction.accountId ? accountMap.get(transaction.accountId) || transaction.accountId : (transaction.account || ""),
                transaction.categoryId ? categoryMap.get(transaction.categoryId) || transaction.categoryId : (transaction.category || ""),
                transaction.description || "",
                transaction.notes || "",
                transaction.id
            ]);
            const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
            const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `velora-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setStatus(`CSV export created · ${transactions.length} transactions exported.`, "success");
        } catch (error) {
            console.error("[Velora] CSV export failed:", error);
            setStatus("Velora could not create the CSV export. Please try again.", "error");
        }
    }

    button?.addEventListener("click", exportTransactions);
    return { exportTransactions };
})();
window.VeloraCSV = VeloraCSV;
