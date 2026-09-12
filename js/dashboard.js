const VeloraDashboard = (() => {
    const recentList = document.querySelector("#recent-transactions");
    const emptyState = document.querySelector("#recent-transactions-empty");
    const monthLabel = document.querySelector("#current-month-label");
    const budgetPreviewList = document.querySelector("#budget-preview-list");
    const budgetPreviewEmpty = document.querySelector("#budget-preview-empty");
    const budgetPreviewTitle = document.querySelector("#budget-preview-title");
    const recurringPreviewList = document.querySelector("#recurring-preview-list");
    const recurringPreviewEmpty = document.querySelector("#recurring-preview-empty");
    const recurringPreviewTitle = document.querySelector("#recurring-preview-title");
    const goalsPreviewList = document.querySelector("#goals-preview-list");
    const goalsPreviewEmpty = document.querySelector("#goals-preview-empty");
    const goalsPreviewTitle = document.querySelector("#goals-preview-title");

    let currentData = {
        accounts: [],
        transactions: []
    };

    let refreshQueued = false;

    function calculateTotalBalance(accounts, transactions) {
        const initialBalances = accounts.reduce(
            (total, account) =>
                total + (Number(account.initialBalance) || 0),
            0
        );

        const transactionTotal = transactions.reduce(
            (total, transaction) => {
                const amount = Number(transaction.amount) || 0;

                return total + (
                    transaction.type === "income"
                        ? amount
                        : -amount
                );
            },
            0
        );

        return initialBalances + transactionTotal;
    }

    function calculateMonthlyTotal(
        transactions,
        type,
        date = new Date()
    ) {
        const month = `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(2, "0")}`;

        return transactions.reduce(
            (total, transaction) => {
                if (
                    transaction.type !== type ||
                    !String(transaction.date).startsWith(month)
                ) {
                    return total;
                }

                return total + (Number(transaction.amount) || 0);
            },
            0
        );
    }

    function calculateAccountBalance(
        account,
        transactions
    ) {
        return transactions.reduce(
            (balance, transaction) => {
                if (
                    transaction.account !== account.name
                ) {
                    return balance;
                }

                const amount =
                    Number(transaction.amount) || 0;

                return balance + (
                    transaction.type === "income"
                        ? amount
                        : -amount
                );
            },
            Number(account.initialBalance) || 0
        );
    }

    function getRecentTransactions(
        transactions,
        limit = 5
    ) {
        return [...transactions]
            .sort(
                (first, second) =>
                    new Date(second.date) -
                        new Date(first.date) ||
                    (second.createdAt ?? 0) -
                        (first.createdAt ?? 0)
            )
            .slice(0, limit);
    }

    function escapeHtml(value) {
        return String(value).replace(
            /[&<>"']/g,
            (character) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character])
        );
    }

    function transactionTemplate(transaction) {
        const income =
            transaction.type === "income";

        const metadata = [
            transaction.description,
            transaction.account
        ]
            .filter(Boolean)
            .join(" · ");

        return `
            <article class="transaction-row">
                <div
                    class="transaction-icon ${
                        income
                            ? "is-income"
                            : "is-expense"
                    }"
                    aria-hidden="true"
                >
                    ${income ? "+" : "−"}
                </div>

                <div class="transaction-details">
                    <strong>
                        ${escapeHtml(
                            transaction.category ||
                            "Uncategorized"
                        )}
                    </strong>

                    ${
                        metadata
                            ? `<span>${escapeHtml(
                                  metadata
                              )}</span>`
                            : ""
                    }

                    <time datetime="${escapeHtml(
                        transaction.date
                    )}">
                        ${VeloraFormat.date(
                            transaction.date
                        )}
                    </time>
                </div>

                <strong
                    class="transaction-amount ${
                        income
                            ? "positive"
                            : "negative"
                    }"
                >
                    ${income ? "+" : "−"}
                    ${VeloraFormat.rupiah(
                        transaction.amount
                    )}
                </strong>

                <div class="transaction-actions">
                    <button
                        class="icon-button small-icon"
                        type="button"
                        data-dashboard-edit-id="${escapeHtml(
                            transaction.id
                        )}"
                        aria-label="Edit transaction"
                        title="Edit transaction"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="m4 16-.8 4.8L8 20l10.5-10.5-4-4L4 16Z"/>
                            <path d="m13 6 4 4"/>
                        </svg>
                    </button>

                    <button
                        class="icon-button small-icon"
                        type="button"
                        data-dashboard-delete-id="${escapeHtml(
                            transaction.id
                        )}"
                        aria-label="Delete transaction"
                        title="Delete transaction"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="M5 7h14"/>
                            <path d="M10 11v6"/>
                            <path d="M14 11v6"/>
                            <path d="M9 7V4h6v3"/>
                            <path d="m6 7 1 13h10l1-13"/>
                        </svg>
                    </button>
                </div>
            </article>
        `;
    }

    function updateSummary(
        accounts,
        transactions
    ) {
        document.querySelector(
            ".balance-value"
        ).textContent =
            VeloraFormat.rupiah(
                calculateTotalBalance(
                    accounts,
                    transactions
                )
            );

        document.querySelector(
            "#monthly-income"
        ).textContent =
            VeloraFormat.rupiah(
                calculateMonthlyTotal(
                    transactions,
                    "income"
                )
            );

        document.querySelector(
            "#monthly-expenses"
        ).textContent =
            VeloraFormat.rupiah(
                calculateMonthlyTotal(
                    transactions,
                    "expense"
                )
            );

        document.querySelector(
            "#account-summary-count"
        ).textContent =
            `${accounts.length} account${
                accounts.length === 1
                    ? ""
                    : "s"
            }`;

        document.querySelector(
            "#account-summary-total"
        ).textContent =
            VeloraFormat.rupiah(
                accounts.reduce(
                    (total, account) =>
                        total +
                        calculateAccountBalance(
                            account,
                            transactions
                        ),
                    0
                )
            );

        monthLabel.textContent =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    month: "short",
                    year: "numeric"
                }
            )
                .format(new Date())
                .toUpperCase();
    }

    function renderRecent(
        transactions
    ) {
        const recent =
            getRecentTransactions(
                transactions
            );

        recentList.innerHTML =
            recent
                .map(transactionTemplate)
                .join("");

        recentList.hidden =
            recent.length === 0;

        emptyState.hidden =
            recent.length !== 0;
    }

    function renderBudgetPreview(
        budgets,
        categories,
        transactions
    ) {
        const now = new Date();

        const month =
            `${now.getFullYear()}-${String(
                now.getMonth() + 1
            ).padStart(2, "0")}`;

        const current =
            budgets
                .filter(
                    (budget) =>
                        budget.month ===
                        month
                )
                .slice(0, 4)
                .map((budget) => {
                    const category =
                        categories.find(
                            (item) =>
                                item.id ===
                                budget.categoryId
                        );

                    const spent =
                        transactions.reduce(
                            (
                                total,
                                transaction
                            ) => {
                                if (
                                    transaction.type !==
                                        "expense" ||
                                    transaction.category !==
                                        category?.name ||
                                    !String(
                                        transaction.date
                                    ).startsWith(
                                        month
                                    )
                                ) {
                                    return total;
                                }

                                return (
                                    total +
                                    (
                                        Number(
                                            transaction.amount
                                        ) || 0
                                    )
                                );
                            },
                            0
                        );

                    return {
                        ...budget,
                        category,
                        spent
                    };
                });

        budgetPreviewList.innerHTML =
            current
                .map(
                    (budget) => `
                        <div class="budget-preview-row">
                            <span>
                                ${escapeHtml(
                                    budget.category?.name ??
                                    "Unavailable"
                                )}
                            </span>

                            <strong>
                                ${VeloraFormat.rupiah(
                                    budget.spent
                                )}
                                /
                                ${VeloraFormat.rupiah(
                                    budget.limit
                                )}
                            </strong>
                        </div>
                    `
                )
                .join("");

        budgetPreviewList.hidden =
            current.length === 0;

        budgetPreviewEmpty.hidden =
            current.length !== 0;

        budgetPreviewTitle.textContent =
            current.length === 0
                ? "Nothing planned yet"
                : "This month";
    }

    function recurringNext(
        startDate,
        frequency,
        today = new Date()
    ) {
        let next =
            new Date(
                `${startDate}T00:00:00`
            );

        if (
            Number.isNaN(
                next.getTime()
            )
        ) {
            return new Date(
                8640000000000000
            );
        }

        const current =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
            );

        let guard = 0;

        while (
            next < current &&
            guard < 1000
        ) {
            if (
                frequency === "weekly"
            ) {
                next.setDate(
                    next.getDate() +
                        7
                );
            } else if (
                frequency === "yearly"
            ) {
                next.setFullYear(
                    next.getFullYear() +
                        1
                );
            } else {
                next.setMonth(
                    next.getMonth() +
                        1
                );
            }

            guard += 1;
        }

        return next;
    }

    function renderRecurringPreview(
        expenses,
        categories
    ) {
        const active =
            expenses
                .filter(
                    (expense) =>
                        expense.active
                )
                .map((expense) => ({
                    ...expense,
                    category:
                        categories.find(
                            (category) =>
                                category.id ===
                                expense.categoryId
                        ),
                    next:
                        recurringNext(
                            expense.startDate,
                            expense.frequency
                        )
                }))
                .sort(
                    (first, second) =>
                        first.next -
                        second.next
                )
                .slice(0, 3);

        recurringPreviewList.innerHTML =
            active
                .map(
                    (expense) => `
                        <div class="recurring-preview-row">
                            <span>
                                ${escapeHtml(
                                    expense.name
                                )}

                                <small>
                                    ${new Intl.DateTimeFormat(
                                        "en-US",
                                        {
                                            month: "short",
                                            day: "2-digit"
                                        }
                                    ).format(
                                        expense.next
                                    )}
                                </small>
                            </span>

                            <strong>
                                ${VeloraFormat.rupiah(
                                    expense.amount
                                )}
                            </strong>
                        </div>
                    `
                )
                .join("");

        recurringPreviewList.hidden =
            active.length === 0;

        recurringPreviewEmpty.hidden =
            active.length !== 0;

        recurringPreviewTitle.textContent =
            active.length === 0
                ? "No upcoming expenses"
                : "Upcoming";
    }

    function renderGoalsPreview(
        goals
    ) {
        const active =
            goals
                .filter(
                    (goal) => {
                        const target =
                            Number(
                                goal.targetAmount
                            ) || 0;

                        const current =
                            Number(
                                goal.currentAmount
                            ) || 0;

                        return (
                            target > 0 &&
                            current <
                                target
                        );
                    }
                )
                .sort(
                    (first, second) => {
                        const firstTarget =
                            Number(
                                first.targetAmount
                            ) || 0;

                        const secondTarget =
                            Number(
                                second.targetAmount
                            ) || 0;

                        const firstProgress =
                            firstTarget > 0
                                ? (
                                      Number(
                                          first.currentAmount
                                      ) || 0
                                  ) /
                                  firstTarget
                                : 0;

                        const secondProgress =
                            secondTarget > 0
                                ? (
                                      Number(
                                          second.currentAmount
                                      ) || 0
                                  ) /
                                  secondTarget
                                : 0;

                        return (
                            secondProgress -
                            firstProgress
                        );
                    }
                )
                .slice(0, 3);

        goalsPreviewList.innerHTML =
            active
                .map((goal) => {
                    const target =
                        Number(
                            goal.targetAmount
                        ) || 0;

                    const current =
                        Number(
                            goal.currentAmount
                        ) || 0;

                    const progress =
                        target > 0
                            ? Math.min(
                                  (
                                      current /
                                      target
                                  ) *
                                      100,
                                  100
                              )
                            : 0;

                    return `
                        <div class="goal-preview-row">
                            <span>
                                ${escapeHtml(
                                    goal.name
                                )}
                            </span>

                            <strong>
                                ${Math.round(
                                    progress
                                )}%
                            </strong>
                        </div>
                    `;
                })
                .join("");

        goalsPreviewList.hidden =
            active.length === 0;

        goalsPreviewEmpty.hidden =
            active.length !== 0;

        goalsPreviewTitle.textContent =
            active.length === 0
                ? "No goals yet"
                : "Savings goals";
    }

    async function refresh() {
        if (refreshQueued) {
            return;
        }

        refreshQueued = true;

        try {
            const [
                accounts,
                transactions,
                budgets,
                categories,
                recurring,
                goals
            ] = await Promise.all([
                VeloraDB.getAccounts(),
                VeloraDB.getTransactions(),
                VeloraDB.getBudgets(),
                VeloraDB.getCategories(),
                VeloraDB.getRecurringExpenses(),
                VeloraDB.getGoals()
            ]);

            currentData = {
                accounts,
                transactions
            };

            updateSummary(
                accounts,
                transactions
            );

            renderRecent(
                transactions
            );

            renderBudgetPreview(
                budgets,
                categories,
                transactions
            );

            renderRecurringPreview(
                recurring,
                categories
            );

            renderGoalsPreview(
                goals
            );
        } catch (error) {
            console.error(
                "[Velora] Dashboard could not be refreshed:",
                error
            );
        } finally {
            refreshQueued =
                false;
        }
    }

    function bind() {
        recentList.addEventListener(
            "click",
            async (event) => {
                const editButton =
                    event.target.closest(
                        "[data-dashboard-edit-id]"
                    );

                const deleteButton =
                    event.target.closest(
                        "[data-dashboard-delete-id]"
                    );

                if (editButton) {
                    const transaction =
                        await VeloraDB.getTransaction(
                            editButton.dataset
                                .dashboardEditId
                        );

                    if (
                        transaction &&
                        window.VeloraTransactions
                    ) {
                        window.VeloraTransactions.openSheet(
                            transaction,
                            editButton
                        );
                    }
                }

                if (deleteButton) {
                    window.VeloraTransactions?.openDelete(
                        deleteButton.dataset
                            .dashboardDeleteId,
                        deleteButton
                    );
                }
            }
        );
    }

    function init() {
        if (!recentList) {
            return;
        }

        bind();

        window.addEventListener(
            "velora:transactions-updated",
            refresh
        );

        window.addEventListener(
            "velora:accounts-updated",
            refresh
        );

        window.addEventListener(
            "velora:budgets-updated",
            refresh
        );

        window.addEventListener(
            "velora:categories-updated",
            refresh
        );

        window.addEventListener(
            "velora:recurring-updated",
            refresh
        );

        window.addEventListener(
            "velora:goals-updated",
            refresh
        );

        refresh();
    }

    window.VeloraDashboard = {
        init,
        refresh,
        calculateTotalBalance,
        calculateMonthlyTotal,
        getRecentTransactions,
        get data() {
            return currentData;
        }
    };

    window.VeloraDashboard.init();
})();