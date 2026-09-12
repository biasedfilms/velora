const VeloraAccounts = (() => {
    const TYPE_LABELS = {
        cash: "Cash",
        bank: "Bank",
        ewallet: "E-wallet",
        wallet: "Wallet",
        savings: "Savings"
    };

    const panel = document.querySelector("#accounts-panel");
    const list = document.querySelector("#account-list");
    const emptyState = document.querySelector("#account-empty-state");
    const sheet = document.querySelector("#account-sheet");
    const backdrop = document.querySelector("#account-backdrop");
    const form = document.querySelector("#account-form");
    const nameInput = document.querySelector("#account-name");
    const balanceInput = document.querySelector("#account-initial-balance");
    const message = document.querySelector("#account-form-message");

    let accounts = [];
    let editingId = null;
    let deletingId = null;
    let returnFocus = null;

    function makeId() {
        return window.crypto?.randomUUID?.() ??
            `account-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function escapeHtml(value) {
        return String(value).replace(
            /[&<>"']/g,
            (character) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "\"": "&quot;",
                "'": "&#039;"
            }[character])
        );
    }

    function setMessage(text = "") {
        message.textContent = text;
        message.hidden = !text;
    }

    function formatAmountInput(amount) {
        return window.VeloraFormat?.amount(amount) ?? String(amount ?? "");
    }

    function calculateBalance(account, transactions) {
        return transactions.reduce((balance, transaction) => {
            if (transaction.account !== account.name) {
                return balance;
            }

            return balance +
                (transaction.type === "income"
                    ? transaction.amount
                    : -transaction.amount);
        }, Number(account.initialBalance) || 0);
    }

    async function load() {
        accounts = await VeloraDB.getAccounts();

        const transactions = await VeloraDB.getTransactions();

        render(transactions);
        updateSummary(accounts, transactions);

        window.dispatchEvent(
            new CustomEvent("velora:accounts-updated", {
                detail: accounts
            })
        );

        return accounts;
    }

    async function refreshBalances() {
        try {
            const [latestAccounts, transactions] = await Promise.all([
                VeloraDB.getAccounts(),
                VeloraDB.getTransactions()
            ]);

            accounts = latestAccounts;

            render(transactions);
            updateSummary(accounts, transactions);
        } catch (error) {
            console.error(
                "[Velora] Account balances could not be refreshed:",
                error
            );
        }
    }

    function render(transactions = []) {
        list.innerHTML = accounts.map((account) => `
            <article class="account-row">
                <span class="account-mark" aria-hidden="true">
                    ${escapeHtml(account.name.charAt(0).toUpperCase())}
                </span>

                <div class="account-details">
                    <strong>${escapeHtml(account.name)}</strong>
                    <span>${TYPE_LABELS[account.type] ?? "Account"}</span>
                </div>

                <strong class="account-balance">
                    ${window.VeloraFormat.rupiah(
                        calculateBalance(account, transactions)
                    )}
                </strong>

                <div class="account-row-actions">
                    <button
                        class="text-button"
                        type="button"
                        data-edit-account="${account.id}"
                    >
                        Edit
                    </button>

                    <button
                        class="text-button danger-text"
                        type="button"
                        data-delete-account="${account.id}"
                    >
                        Delete
                    </button>
                </div>
            </article>
        `).join("");

        list.hidden = accounts.length === 0;
        emptyState.hidden = accounts.length !== 0;
    }

    function updateSummary(accountList, transactions) {
        const total = accountList.reduce(
            (sum, account) =>
                sum + calculateBalance(account, transactions),
            0
        );

        document.querySelector("#account-summary-count").textContent =
            `${accountList.length} account${accountList.length === 1 ? "" : "s"}`;

        document.querySelector("#account-summary-total").textContent =
            window.VeloraFormat.rupiah(total);

        document.querySelector(".balance-value").textContent =
            window.VeloraFormat.rupiah(total);
    }

    function openSheet(account = null, trigger = null) {
        editingId = account?.id ?? null;
        returnFocus = trigger ?? document.activeElement;

        form.reset();

        nameInput.value = account?.name ?? "";
        form.elements.type.value = account?.type ?? "cash";
        balanceInput.value = formatAmountInput(
            account?.initialBalance ?? ""
        );

        document.querySelector("#account-sheet-eyebrow").textContent =
            account ? "EDIT ACCOUNT" : "NEW ACCOUNT";

        document.querySelector("#account-sheet-title").textContent =
            account ? "Edit account" : "New account";

        document.querySelector("#account-submit-label").textContent =
            account ? "Save changes" : "Create account";

        setMessage();

        backdrop.hidden = false;
        sheet.hidden = false;
        document.body.classList.add("modal-open");

        requestAnimationFrame(() => {
            nameInput.focus();
        });
    }

    function closeSheet() {
        sheet.hidden = true;
        backdrop.hidden = true;
        document.body.classList.remove("modal-open");
        setMessage();

        returnFocus?.focus();
    }

    async function save(event) {
        event.preventDefault();

        const name = nameInput.value.trim();

        const initialBalance = Number(
            String(balanceInput.value).replace(/\./g, "")
        );

        const duplicate = accounts.some(
            (account) =>
                account.name.toLowerCase() === name.toLowerCase() &&
                account.id !== editingId
        );

        if (!name) {
            setMessage("Enter an account name.");
            return;
        }

        if (duplicate) {
            setMessage("That account already exists.");
            return;
        }

        if (!Number.isFinite(initialBalance) || initialBalance < 0) {
            setMessage(
                "Enter a valid balance of zero or more."
            );
            return;
        }

        const now = Date.now();

        try {
            if (editingId) {
                const existing = await VeloraDB.getAccount(editingId);

                await VeloraDB.updateAccount({
                    ...existing,
                    name,
                    type: form.elements.type.value,
                    initialBalance,
                    updatedAt: now
                });

                if (existing.name !== name) {
                    await VeloraDB.renameTransactionAccount(
                        existing.name,
                        name
                    );

                    window.dispatchEvent(
                        new CustomEvent("velora:transactions-updated")
                    );
                }
            } else {
                await VeloraDB.addAccount({
                    id: makeId(),
                    name,
                    type: form.elements.type.value,
                    initialBalance,
                    createdAt: now,
                    updatedAt: now
                });
            }

            closeSheet();

            await load();
            await window.VeloraTransactions?.render();
        } catch (error) {
            console.error(
                "[Velora] Account save failed:",
                error
            );

            setMessage(
                "This account could not be saved. Please try again."
            );
        }
    }

    async function openDelete(id) {
        const account = accounts.find(
            (item) => item.id === id
        );

        if (!account) {
            return;
        }

        const transactions = await VeloraDB.getTransactions();

        const used = transactions.some(
            (transaction) =>
                transaction.account === account.name
        );

        const recurring = await VeloraDB.getRecurringExpenses();

        const recurringUsed = recurring.some(
            (expense) =>
                expense.accountId === account.id
        );

        const goals = await VeloraDB.getGoals();

        const goalUsed = goals.some(
            (goal) =>
                goal.accountId === account.id
        );

        deletingId =
            used || recurringUsed || goalUsed
                ? null
                : id;

        const inUse =
            used || recurringUsed || goalUsed;

        document.querySelector("#account-delete-title").textContent =
            inUse
                ? "Account is in use"
                : "Delete account?";

        document.querySelector("#account-delete-message").textContent =
            used
                ? `“${account.name}” is linked to existing transactions and cannot be deleted.`
                : recurringUsed
                    ? `“${account.name}” is linked to recurring expenses and cannot be deleted.`
                    : goalUsed
                        ? `“${account.name}” is linked to savings goals and cannot be deleted.`
                        : `Delete “${account.name}” from this device?`;

        document.querySelector("#confirm-account-delete").hidden = inUse;

        document.querySelector("#account-delete-dialog").hidden = false;

        document
            .querySelector(
                inUse
                    ? "#cancel-account-delete"
                    : "#confirm-account-delete"
            )
            .focus();
    }

    async function confirmDelete() {
        if (!deletingId) {
            return;
        }

        await VeloraDB.deleteAccount(deletingId);

        deletingId = null;

        document.querySelector(
            "#account-delete-dialog"
        ).hidden = true;

        await load();
    }

    function bind() {
        document
            .querySelectorAll("[data-open-account]")
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    (event) =>
                        openSheet(
                            null,
                            event.currentTarget
                        )
                );
            });

        document
            .querySelector("#add-account")
            .addEventListener(
                "click",
                (event) =>
                    openSheet(
                        null,
                        event.currentTarget
                    )
            );

        document
            .querySelector("#close-account")
            .addEventListener(
                "click",
                closeSheet
            );

        document
            .querySelector("#cancel-account")
            .addEventListener(
                "click",
                closeSheet
            );

        backdrop.addEventListener(
            "click",
            closeSheet
        );

        form.addEventListener(
            "submit",
            save
        );

        balanceInput.addEventListener(
            "input",
            window.VeloraFormat.whileTyping
        );

        list.addEventListener(
            "click",
            (event) => {
                const editButton =
                    event.target.closest(
                        "[data-edit-account]"
                    );

                const deleteButton =
                    event.target.closest(
                        "[data-delete-account]"
                    );

                if (editButton) {
                    openSheet(
                        accounts.find(
                            (account) =>
                                account.id ===
                                editButton.dataset.editAccount
                        ),
                        editButton
                    );
                }

                if (deleteButton) {
                    openDelete(
                        deleteButton.dataset.deleteAccount
                    );
                }
            }
        );

        document
            .querySelector("#cancel-account-delete")
            .addEventListener(
                "click",
                () => {
                    deletingId = null;

                    document.querySelector(
                        "#account-delete-dialog"
                    ).hidden = true;
                }
            );

        document
            .querySelector("#confirm-account-delete")
            .addEventListener(
                "click",
                confirmDelete
            );

        window.addEventListener(
            "velora:transactions-updated",
            refreshBalances
        );

        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Escape" &&
                    !sheet.hidden
                ) {
                    closeSheet();
                }

                if (
                    event.key === "Escape" &&
                    !document.querySelector(
                        "#account-delete-dialog"
                    ).hidden
                ) {
                    document
                        .querySelector(
                            "#cancel-account-delete"
                        )
                        .click();
                }
            }
        );
    }

    function setVisible(visible) {
        panel.hidden = !visible;

        if (visible) {
            refreshBalances();
        }
    }

    async function init() {
        bind();
        await load();
    }

    const api = {
        init,
        load,
        refreshBalances,
        calculateBalance,
        get accounts() {
            return accounts;
        },
        setVisible
    };

    window.VeloraAccounts = api;
    api.ready = init();
})();