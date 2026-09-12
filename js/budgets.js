const VeloraBudgets = (() => {
    const panel = document.querySelector("#budgets-panel");
    const list = document.querySelector("#budget-list");
    const emptyState = document.querySelector("#budget-empty-state");
    const sheet = document.querySelector("#budget-sheet");
    const backdrop = document.querySelector("#budget-backdrop");
    const form = document.querySelector("#budget-form");
    const categorySelect = document.querySelector("#budget-category");
    const limitInput = document.querySelector("#budget-limit");
    const monthInput = document.querySelector("#budget-month");
    const message = document.querySelector("#budget-form-message");

    let budgets = [];
    let categories = [];
    let transactions = [];
    let selectedMonth = currentMonth();
    let editingId = null;
    let deletingId = null;
    let returnFocus = null;

    function currentMonth(date = new Date()) {
        return `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(2, "0")}`;
    }

    function monthLabel(month) {
        const [year, value] = month.split("-");

        return new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric"
        }).format(
            new Date(
                Number(year),
                Number(value) - 1,
                1
            )
        );
    }

    function makeId() {
        return window.crypto?.randomUUID?.() ??
            `budget-${Date.now()}-${Math.random()
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

    function calculateSpent(
        budget,
        categoryList = categories,
        transactionList = transactions
    ) {
        const category = categoryList.find(
            (item) => item.id === budget.categoryId
        );

        if (!category) {
            return 0;
        }

        return transactionList.reduce(
            (total, transaction) => {
                if (
                    transaction.type !== "expense" ||
                    transaction.category !== category.name ||
                    transaction.date?.slice(0, 7) !== budget.month
                ) {
                    return total;
                }

                return total +
                    (Number(transaction.amount) || 0);
            },
            0
        );
    }

    function getMetrics(budget) {
        const spent = calculateSpent(budget);
        const limit = Number(budget.limit) || 0;
        const remaining = limit - spent;

        const progress =
            limit > 0
                ? Math.min((spent / limit) * 100, 100)
                : 0;

        return {
            ...budget,
            category: categories.find(
                (item) => item.id === budget.categoryId
            ),
            spent,
            remaining,
            progress
        };
    }

    function render() {
        const visible = budgets
            .filter(
                (budget) =>
                    budget.month === selectedMonth
            )
            .map(getMetrics);

        list.innerHTML = visible
            .map((budget) => {
                const over = budget.remaining < 0;

                const status =
                    budget.remaining === 0
                        ? "Budget reached"
                        : over
                            ? `${window.VeloraFormat.rupiah(
                                Math.abs(
                                    budget.remaining
                                )
                            )} over`
                            : `${window.VeloraFormat.rupiah(
                                budget.remaining
                            )} remaining`;

                return `
                    <article class="budget-row">
                        <div class="budget-row-header">
                            <div>
                                <strong>
                                    ${escapeHtml(
                                        budget.category?.name ??
                                        "Unavailable category"
                                    )}
                                </strong>

                                <span>
                                    ${window.VeloraFormat.rupiah(
                                        budget.spent
                                    )}
                                    of
                                    ${window.VeloraFormat.rupiah(
                                        budget.limit
                                    )}
                                </span>
                            </div>

                            <strong class="${
                                over ? "over-budget" : ""
                            }">
                                ${escapeHtml(status)}
                            </strong>
                        </div>

                        <div
                            class="budget-progress"
                            role="progressbar"
                            aria-valuenow="${Math.round(
                                budget.progress
                            )}"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-label="${escapeHtml(
                                budget.category?.name ??
                                "Budget"
                            )} progress"
                        >
                            <span
                                style="width: ${budget.progress}%"
                            ></span>
                        </div>

                        <div class="budget-row-footer">
                            <span class="muted">
                                ${Math.round(
                                    budget.progress
                                )}% used
                            </span>

                            <div class="budget-row-actions">
                                <button
                                    class="text-button"
                                    type="button"
                                    data-edit-budget="${budget.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    class="text-button danger-text"
                                    type="button"
                                    data-delete-budget="${budget.id}"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </article>
                `;
            })
            .join("");

        list.hidden = visible.length === 0;
        emptyState.hidden = visible.length !== 0;

        document.querySelector(
            "#budget-month-label"
        ).textContent = monthLabel(selectedMonth);

        document.querySelector(
            "#budget-month-control"
        ).textContent = monthLabel(selectedMonth);
    }

    function updateCategoryOptions(selected = "") {
        categorySelect.innerHTML = categories
            .map(
                (category) => `
                    <option
                        value="${escapeHtml(category.id)}"
                        ${
                            category.id === selected
                                ? "selected"
                                : ""
                        }
                    >
                        ${escapeHtml(category.name)}
                    </option>
                `
            )
            .join("");
    }

    async function refresh() {
        try {
            const [
                latestBudgets,
                latestCategories,
                latestTransactions
            ] = await Promise.all([
                VeloraDB.getBudgets(),
                VeloraDB.getCategories(),
                VeloraDB.getTransactions()
            ]);

            budgets = latestBudgets;
            categories = latestCategories;
            transactions = latestTransactions;

            updateCategoryOptions(
                editingId
                    ? categorySelect.value
                    : ""
            );

            render();
        } catch (error) {
            console.error(
                "[Velora] Budget refresh failed:",
                error
            );
        }
    }

    async function load() {
        await refresh();

        window.dispatchEvent(
            new CustomEvent(
                "velora:budgets-updated"
            )
        );

        return budgets;
    }

    function openSheet(
        budget = null,
        trigger = null
    ) {
        editingId = budget?.id ?? null;
        returnFocus =
            trigger ?? document.activeElement;

        form.reset();

        updateCategoryOptions(
            budget?.categoryId ??
            categories[0]?.id ??
            ""
        );

        limitInput.value = budget
            ? window.VeloraFormat.amount(
                budget.limit
            )
            : "";

        monthInput.value =
            budget?.month ??
            selectedMonth;

        document.querySelector(
            "#budget-sheet-eyebrow"
        ).textContent =
            budget
                ? "EDIT BUDGET"
                : "NEW BUDGET";

        document.querySelector(
            "#budget-sheet-title"
        ).textContent =
            budget
                ? "Edit budget"
                : "New budget";

        document.querySelector(
            "#budget-submit-label"
        ).textContent =
            budget
                ? "Save changes"
                : "Create budget";

        setMessage();

        backdrop.hidden = false;
        sheet.hidden = false;

        document.body.classList.add(
            "modal-open"
        );

        requestAnimationFrame(() => {
            categorySelect.focus();
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

        const categoryId =
            categorySelect.value;

        const month =
            monthInput.value;

        const limit = Number(
            String(limitInput.value)
                .replace(/\./g, "")
        );

        if (!categoryId) {
            setMessage(
                "Choose a category."
            );
            return;
        }

        if (
            !Number.isFinite(limit) ||
            limit <= 0
        ) {
            setMessage(
                "Enter a limit greater than zero."
            );
            return;
        }

        if (!month) {
            setMessage(
                "Choose a month."
            );
            return;
        }

        const duplicate = budgets.some(
            (budget) =>
                budget.categoryId === categoryId &&
                budget.month === month &&
                budget.id !== editingId
        );

        if (duplicate) {
            setMessage(
                "That category already has a budget for this month."
            );
            return;
        }

        const now = Date.now();

        try {
            if (editingId) {
                const existing =
                    await VeloraDB.getBudget(
                        editingId
                    );

                await VeloraDB.updateBudget({
                    ...existing,
                    categoryId,
                    month,
                    limit,
                    updatedAt: now
                });
            } else {
                await VeloraDB.addBudget({
                    id: makeId(),
                    categoryId,
                    month,
                    limit,
                    createdAt: now,
                    updatedAt: now
                });
            }

            selectedMonth = month;

            closeSheet();

            await load();
        } catch (error) {
            console.error(
                "[Velora] Budget save failed:",
                error
            );

            setMessage(
                "This budget could not be saved. Please try again."
            );
        }
    }

    function openDelete(id) {
        deletingId = id;

        document.querySelector(
            "#budget-delete-dialog"
        ).hidden = false;

        document.querySelector(
            "#confirm-budget-delete"
        ).focus();
    }

    async function confirmDelete() {
        if (!deletingId) {
            return;
        }

        try {
            await VeloraDB.deleteBudget(
                deletingId
            );

            deletingId = null;

            document.querySelector(
                "#budget-delete-dialog"
            ).hidden = true;

            await load();
        } catch (error) {
            console.error(
                "[Velora] Budget deletion failed:",
                error
            );
        }
    }

    function changeMonth(offset) {
        const [
            year,
            month
        ] = selectedMonth
            .split("-")
            .map(Number);

        selectedMonth = currentMonth(
            new Date(
                year,
                month - 1 + offset,
                1
            )
        );

        render();
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
                "[data-open-budget]"
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
            .querySelector("#add-budget")
            .addEventListener(
                "click",
                (event) =>
                    openSheet(
                        null,
                        event.currentTarget
                    )
            );

        document
            .querySelector("#close-budget")
            .addEventListener(
                "click",
                closeSheet
            );

        document
            .querySelector("#cancel-budget")
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

        limitInput.addEventListener(
            "input",
            window.VeloraFormat.whileTyping
        );

        document
            .querySelector(
                "#previous-budget-month"
            )
            .addEventListener(
                "click",
                () => changeMonth(-1)
            );

        document
            .querySelector(
                "#next-budget-month"
            )
            .addEventListener(
                "click",
                () => changeMonth(1)
            );

        list.addEventListener(
            "click",
            (event) => {
                const editButton =
                    event.target.closest(
                        "[data-edit-budget]"
                    );

                const deleteButton =
                    event.target.closest(
                        "[data-delete-budget]"
                    );

                if (editButton) {
                    openSheet(
                        budgets.find(
                            (budget) =>
                                budget.id ===
                                editButton
                                    .dataset
                                    .editBudget
                        ),
                        editButton
                    );
                }

                if (deleteButton) {
                    openDelete(
                        deleteButton.dataset
                            .deleteBudget
                    );
                }
            }
        );

        document
            .querySelector(
                "#cancel-budget-delete"
            )
            .addEventListener(
                "click",
                () => {
                    deletingId = null;

                    document.querySelector(
                        "#budget-delete-dialog"
                    ).hidden = true;
                }
            );

        document
            .querySelector(
                "#confirm-budget-delete"
            )
            .addEventListener(
                "click",
                confirmDelete
            );

        window.addEventListener(
            "velora:transactions-updated",
            refresh
        );

        window.addEventListener(
            "velora:categories-updated",
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
                }

                const deleteDialog =
                    document.querySelector(
                        "#budget-delete-dialog"
                    );

                if (
                    event.key === "Escape" &&
                    !deleteDialog.hidden
                ) {
                    document.querySelector(
                        "#cancel-budget-delete"
                    ).click();
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
        setVisible,
        calculateSpent,
        getMetrics,
        get budgets() {
            return budgets;
        }
    };

    window.VeloraBudgets = api;
    api.ready = init();
})();