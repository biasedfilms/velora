const VeloraRecurring = (() => {
    const panel = document.querySelector("#recurring-panel");
    const list = document.querySelector("#recurring-list");
    const emptyState = document.querySelector("#recurring-empty-state");
    const sheet = document.querySelector("#recurring-sheet");
    const backdrop = document.querySelector("#recurring-backdrop");
    const form = document.querySelector("#recurring-form");
    const nameInput = document.querySelector("#recurring-name");
    const amountInput = document.querySelector("#recurring-amount");
    const categorySelect = document.querySelector("#recurring-category");
    const accountSelect = document.querySelector("#recurring-account");
    const startDateInput = document.querySelector("#recurring-start-date");
    const message = document.querySelector("#recurring-form-message");

    let expenses = [];
    let categories = [];
    let accounts = [];
    let editingId = null;
    let deletingId = null;
    let returnFocus = null;

    function dateValue(date) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${date.getFullYear()}-${month}-${day}`;
    }

    function currentDate() {
        const now = new Date();

        return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );
    }

    function nextOccurrence(
        startDate,
        frequency,
        today = new Date()
    ) {
        const start = new Date(
            `${startDate}T00:00:00`
        );

        if (Number.isNaN(start.getTime())) {
            return "";
        }

        const current = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

        let next = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
        );

        while (next < current) {
            if (frequency === "weekly") {
                next.setDate(
                    next.getDate() + 7
                );
                continue;
            }

            if (frequency === "yearly") {
                const month = next.getMonth();
                const day = next.getDate();

                next.setFullYear(
                    next.getFullYear() + 1
                );

                if (
                    next.getMonth() !== month ||
                    next.getDate() !== day
                ) {
                    next = new Date(
                        next.getFullYear(),
                        month + 1,
                        0
                    );
                }

                continue;
            }

            const originalDay = next.getDate();

            next = new Date(
                next.getFullYear(),
                next.getMonth() + 1,
                1
            );

            const lastDay = new Date(
                next.getFullYear(),
                next.getMonth() + 1,
                0
            ).getDate();

            next.setDate(
                Math.min(
                    originalDay,
                    lastDay
                )
            );
        }

        return dateValue(next);
    }

    function dateLabel(value) {
        if (!value) {
            return "Unavailable";
        }

        return new Intl.DateTimeFormat(
            "en-US",
            {
                month: "short",
                day: "2-digit",
                year: "numeric"
            }
        ).format(
            new Date(
                `${value}T00:00:00`
            )
        );
    }

    function makeId() {
        return window.crypto?.randomUUID?.() ??
            `recurring-${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`;
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

    function updateOptions(
        selectedCategory = "",
        selectedAccount = ""
    ) {
        categorySelect.innerHTML =
            categories
                .map(
                    (category) => `
                        <option
                            value="${escapeHtml(
                                category.id
                            )}"
                            ${
                                category.id ===
                                selectedCategory
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${escapeHtml(
                                category.name
                            )}
                        </option>
                    `
                )
                .join("");

        accountSelect.innerHTML = `
            <option value="">
                No account
            </option>

            ${accounts
                .map(
                    (account) => `
                        <option
                            value="${escapeHtml(
                                account.id
                            )}"
                            ${
                                account.id ===
                                selectedAccount
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${escapeHtml(
                                account.name
                            )}
                        </option>
                    `
                )
                .join("")}
        `;
    }

    function getMetrics(expense) {
        return {
            ...expense,
            category: categories.find(
                (category) =>
                    category.id ===
                    expense.categoryId
            ),
            account: accounts.find(
                (account) =>
                    account.id ===
                    expense.accountId
            ),
            nextDate: nextOccurrence(
                expense.startDate,
                expense.frequency
            )
        };
    }

    function render() {
        const active = expenses
            .filter(
                (expense) => expense.active
            )
            .map(getMetrics)
            .sort(
                (first, second) =>
                    first.nextDate.localeCompare(
                        second.nextDate
                    )
            );

        const paused = expenses
            .filter(
                (expense) => !expense.active
            )
            .map(getMetrics);

        const ordered = [
            ...active,
            ...paused
        ];

        list.innerHTML = ordered
            .map(
                (expense) => `
                    <article
                        class="recurring-row ${
                            expense.active
                                ? ""
                                : "is-paused"
                        }"
                    >
                        <div class="recurring-row-main">
                            <strong>
                                ${escapeHtml(
                                    expense.name
                                )}
                            </strong>

                            <span>
                                ${window.VeloraFormat.rupiah(
                                    expense.amount
                                )}
                                ·
                                ${escapeHtml(
                                    expense.frequency
                                )}
                                ·
                                ${escapeHtml(
                                    expense.category?.name ??
                                    "Unavailable category"
                                )}
                                ${
                                    expense.account
                                        ? ` · ${escapeHtml(
                                            expense.account.name
                                        )}`
                                        : ""
                                }
                            </span>

                            ${
                                expense.active
                                    ? `
                                        <time
                                            datetime="${expense.nextDate}"
                                        >
                                            Next
                                            ${dateLabel(
                                                expense.nextDate
                                            )}
                                        </time>
                                    `
                                    : `
                                        <span class="paused-label">
                                            Paused
                                        </span>
                                    `
                            }
                        </div>

                        <div class="recurring-row-actions">
                            <button
                                class="text-button"
                                type="button"
                                data-toggle-recurring="${
                                    expense.id
                                }"
                            >
                                ${
                                    expense.active
                                        ? "Pause"
                                        : "Resume"
                                }
                            </button>

                            <button
                                class="text-button"
                                type="button"
                                data-edit-recurring="${
                                    expense.id
                                }"
                            >
                                Edit
                            </button>

                            <button
                                class="text-button danger-text"
                                type="button"
                                data-delete-recurring="${
                                    expense.id
                                }"
                            >
                                Delete
                            </button>
                        </div>
                    </article>
                `
            )
            .join("");

        list.hidden = ordered.length === 0;
        emptyState.hidden =
            ordered.length !== 0;
    }

    async function refresh() {
        try {
            const [
                latestExpenses,
                latestCategories,
                latestAccounts
            ] = await Promise.all([
                VeloraDB.getRecurringExpenses(),
                VeloraDB.getCategories(),
                VeloraDB.getAccounts()
            ]);

            expenses = latestExpenses;
            categories = latestCategories;
            accounts = latestAccounts;

            render();

            return expenses;
        } catch (error) {
            console.error(
                "[Velora] Recurring refresh failed:",
                error
            );

            return [];
        }
    }

    async function load() {
        const result = await refresh();

        window.dispatchEvent(
            new CustomEvent(
                "velora:recurring-updated"
            )
        );

        return result;
    }

    function openSheet(
        expense = null,
        trigger = null
    ) {
        editingId =
            expense?.id ?? null;

        returnFocus =
            trigger ??
            document.activeElement;

        form.reset();

        updateOptions(
            expense?.categoryId ??
                categories[0]?.id ??
                "",
            expense?.accountId ?? ""
        );

        nameInput.value =
            expense?.name ?? "";

        amountInput.value =
            expense
                ? window.VeloraFormat.amount(
                    expense.amount
                )
                : "";

        form.elements.frequency.value =
            expense?.frequency ??
            "monthly";

        startDateInput.value =
            expense?.startDate ??
            dateValue(currentDate());

        form.elements.description.value =
            expense?.description ?? "";

        document.querySelector(
            "#recurring-sheet-eyebrow"
        ).textContent =
            expense
                ? "EDIT RECURRING EXPENSE"
                : "NEW RECURRING EXPENSE";

        document.querySelector(
            "#recurring-sheet-title"
        ).textContent =
            expense
                ? "Edit recurring expense"
                : "New recurring expense";

        document.querySelector(
            "#recurring-submit-label"
        ).textContent =
            expense
                ? "Save changes"
                : "Create recurring";

        setMessage();

        backdrop.hidden = false;
        sheet.hidden = false;

        document.body.classList.add(
            "modal-open"
        );

        requestAnimationFrame(() => {
            nameInput.focus();
        });
    }

    function closeSheet() {
        sheet.hidden = true;
        backdrop.hidden = true;

        document.body.classList.remove(
            "modal-open"
        );

        setMessage();

        returnFocus?.focus();

        editingId = null;
    }

    async function save(event) {
        event.preventDefault();

        const name =
            nameInput.value.trim();

        const amount = Number(
            String(amountInput.value)
                .replace(/\./g, "")
        );

        const categoryId =
            categorySelect.value;

        const accountId =
            accountSelect.value || "";

        const frequency =
            form.elements.frequency.value;

        const startDate =
            startDateInput.value;

        const description =
            String(
                form.elements.description.value ??
                ""
            ).trim();

        if (!name) {
            setMessage(
                "Enter a name for this recurring expense."
            );
            return;
        }

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            setMessage(
                "Enter an amount greater than zero."
            );
            return;
        }

        if (!categoryId) {
            setMessage(
                "Choose a category."
            );
            return;
        }

        if (!frequency) {
            setMessage(
                "Choose a frequency."
            );
            return;
        }

        if (
            !startDate ||
            Number.isNaN(
                new Date(
                    `${startDate}T00:00:00`
                ).getTime()
            )
        ) {
            setMessage(
                "Choose a valid start date."
            );
            return;
        }

        const duplicate = expenses.some(
            (expense) =>
                expense.name.toLowerCase() ===
                    name.toLowerCase() &&
                expense.categoryId ===
                    categoryId &&
                expense.accountId ===
                    accountId &&
                expense.frequency ===
                    frequency &&
                expense.id !== editingId
        );

        if (duplicate) {
            setMessage(
                "A matching recurring expense already exists."
            );
            return;
        }

        const now = Date.now();

        const data = {
            name,
            amount,
            categoryId,
            accountId,
            frequency,
            startDate,
            nextDate:
                nextOccurrence(
                    startDate,
                    frequency
                ),
            description,
            updatedAt: now
        };

        try {
            if (editingId) {
                const existing =
                    await VeloraDB.getRecurringExpense(
                        editingId
                    );

                await VeloraDB.updateRecurringExpense({
                    ...existing,
                    ...data,
                    active:
                        existing.active !== false
                });
            } else {
                await VeloraDB.addRecurringExpense({
                    ...data,
                    id: makeId(),
                    active: true,
                    createdAt: now
                });
            }

            closeSheet();

            await load();
        } catch (error) {
            console.error(
                "[Velora] Recurring expense save failed:",
                error
            );

            setMessage(
                "This recurring expense could not be saved. Please try again."
            );
        }
    }

    async function toggle(id) {
        const expense =
            expenses.find(
                (item) =>
                    item.id === id
            );

        if (!expense) {
            return;
        }

        try {
            await VeloraDB.updateRecurringExpense({
                ...expense,
                active:
                    !expense.active,
                updatedAt: Date.now()
            });

            await load();
        } catch (error) {
            console.error(
                "[Velora] Recurring expense toggle failed:",
                error
            );
        }
    }

    function openDelete(
        id,
        trigger = null
    ) {
        const expense =
            expenses.find(
                (item) =>
                    item.id === id
            );

        if (!expense) {
            return;
        }

        deletingId = id;
        returnFocus =
            trigger ??
            document.activeElement;

        document.querySelector(
            "#recurring-delete-dialog"
        ).hidden = false;

        document.querySelector(
            "#confirm-recurring-delete"
        ).focus();
    }

    async function confirmDelete() {
        if (!deletingId) {
            return;
        }

        try {
            await VeloraDB.deleteRecurringExpense(
                deletingId
            );

            deletingId = null;

            document.querySelector(
                "#recurring-delete-dialog"
            ).hidden = true;

            await load();
        } catch (error) {
            console.error(
                "[Velora] Recurring expense deletion failed:",
                error
            );
        }
    }

    function closeDelete() {
        deletingId = null;

        document.querySelector(
            "#recurring-delete-dialog"
        ).hidden = true;

        returnFocus?.focus();
    }

    function setVisible(visible) {
        panel.hidden = !visible;

        if (visible) {
            refresh();
        }
    }

    function bind() {
        document
            .querySelectorAll(
                "[data-open-recurring]"
            )
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
            .querySelector("#add-recurring")
            .addEventListener(
                "click",
                (event) =>
                    openSheet(
                        null,
                        event.currentTarget
                    )
            );

        document
            .querySelector("#close-recurring")
            .addEventListener(
                "click",
                closeSheet
            );

        document
            .querySelector("#cancel-recurring")
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

        amountInput.addEventListener(
            "input",
            window.VeloraFormat.whileTyping
        );

        list.addEventListener(
            "click",
            (event) => {
                const toggleButton =
                    event.target.closest(
                        "[data-toggle-recurring]"
                    );

                const editButton =
                    event.target.closest(
                        "[data-edit-recurring]"
                    );

                const deleteButton =
                    event.target.closest(
                        "[data-delete-recurring]"
                    );

                if (toggleButton) {
                    toggle(
                        toggleButton.dataset
                            .toggleRecurring
                    );

                    return;
                }

                if (editButton) {
                    openSheet(
                        expenses.find(
                            (expense) =>
                                expense.id ===
                                editButton.dataset
                                    .editRecurring
                        ),
                        editButton
                    );

                    return;
                }

                if (deleteButton) {
                    openDelete(
                        deleteButton.dataset
                            .deleteRecurring,
                        deleteButton
                    );
                }
            }
        );

        document
            .querySelector(
                "#cancel-recurring-delete"
            )
            .addEventListener(
                "click",
                closeDelete
            );

        document
            .querySelector(
                "#confirm-recurring-delete"
            )
            .addEventListener(
                "click",
                confirmDelete
            );

        window.addEventListener(
            "velora:categories-updated",
            refresh
        );

        window.addEventListener(
            "velora:accounts-updated",
            refresh
        );

        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Escape" &&
                    !sheet.hidden
                ) {
                    closeSheet();

                    return;
                }

                const deleteDialog =
                    document.querySelector(
                        "#recurring-delete-dialog"
                    );

                if (
                    event.key === "Escape" &&
                    !deleteDialog.hidden
                ) {
                    closeDelete();
                }
            }
        );
    }

    async function init() {
        bind();
        await load();
    }

    const api = {
        init,
        load,
        refresh,
        render,
        nextOccurrence,
        setVisible,
        get expenses() {
            return expenses;
        }
    };

    window.VeloraRecurring = api;
    api.ready = init();
})();