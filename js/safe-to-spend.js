const VeloraSafeToSpend = (() => {
    const valueElement = document.querySelector("#safe-to-spend-value");
    const descriptionElement = document.querySelector("#safe-to-spend-description");
    const balanceElement = document.querySelector("#safe-to-spend-balance");
    const recurringElement = document.querySelector("#safe-to-spend-recurring");
    const budgetElement = document.querySelector("#safe-to-spend-budgets");
    const savingsElement = document.querySelector("#safe-to-spend-savings");
    const details = document.querySelector("#safe-to-spend-details");
    const toggle = document.querySelector("#safe-to-spend-toggle");

    function formatRupiah(amount) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(Math.round(amount)).replace(/\u00a0/g, " ");
    }

    function dateValue(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function monthValue(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    function parseDate(value) {
        const date = new Date(`${value}T00:00:00`);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function nextDate(date, frequency) {
        const next = new Date(date);

        if (frequency === "weekly") {
            next.setDate(next.getDate() + 7);
        } else if (frequency === "yearly") {
            next.setFullYear(next.getFullYear() + 1);
        } else {
            next.setMonth(next.getMonth() + 1);
        }

        return next;
    }

    function calculateCurrentBalance(accounts, transactions) {
        const initialBalance = accounts.reduce(
            (total, account) =>
                total + (Number(account.initialBalance) || 0),
            0
        );

        const transactionBalance = transactions.reduce(
            (total, transaction) => {
                const amount =
                    Number(transaction.amount) || 0;

                return total +
                    (transaction.type === "income"
                        ? amount
                        : -amount);
            },
            0
        );

        return initialBalance + transactionBalance;
    }

    function calculateUpcomingRecurring(expenses, today) {
        const currentMonth = monthValue(today);

        return expenses
            .filter((expense) => expense.active && expense.startDate)
            .reduce((total, expense) => {
                let next = parseDate(expense.startDate);

                if (!next) {
                    return total;
                }

                while (next < today) {
                    next = nextDate(
                        next,
                        expense.frequency
                    );
                }

                let subtotal = 0;
                let count = 0;

                while (
                    monthValue(next) === currentMonth &&
                    count < 100
                ) {
                    subtotal +=
                        Number(expense.amount) || 0;

                    count += 1;

                    next = nextDate(
                        next,
                        expense.frequency
                    );
                }

                return total + subtotal;
            }, 0);
    }

    function calculateRemainingBudgets(
        budgets,
        categories,
        transactions,
        today
    ) {
        const month = monthValue(today);

        return budgets
            .filter((budget) => budget.month === month)
            .reduce((total, budget) => {
                const category = categories.find(
                    (item) => item.id === budget.categoryId
                );

                if (!category) {
                    return total;
                }

                const spent = transactions.reduce(
                    (sum, transaction) => {
                        if (
                            transaction.type !== "expense" ||
                            transaction.category !== category.name ||
                            transaction.date?.slice(0, 7) !== month
                        ) {
                            return sum;
                        }

                        return sum +
                            (Number(transaction.amount) || 0);
                    },
                    0
                );

                const remaining = Math.max(
                    (Number(budget.limit) || 0) - spent,
                    0
                );

                return total + remaining;
            }, 0);
    }

    function monthsUntilTarget(targetDate, today) {
        const target = parseDate(targetDate);

        if (!target || target <= today) {
            return 1;
        }

        const months =
            (target.getFullYear() - today.getFullYear()) * 12 +
            (target.getMonth() - today.getMonth());

        return Math.max(months, 1);
    }

    function calculatePlannedSavings(goals, today) {
        return goals
            .filter((goal) => {
                const current =
                    Number(goal.currentAmount) || 0;

                const target =
                    Number(goal.targetAmount) || 0;

                return (
                    target > current &&
                    Boolean(goal.targetDate)
                );
            })
            .reduce((total, goal) => {
                const current =
                    Number(goal.currentAmount) || 0;

                const target =
                    Number(goal.targetAmount) || 0;

                const remaining =
                    Math.max(
                        target - current,
                        0
                    );

                const months =
                    monthsUntilTarget(
                        goal.targetDate,
                        today
                    );

                return total +
                    remaining / months;
            }, 0);
    }

    function render(result) {
        const safeToSpend =
            result.balance -
            result.recurring -
            result.budgets -
            result.savings;

        const displayValue =
            Math.max(safeToSpend, 0);

        valueElement.textContent =
            formatRupiah(displayValue);

        valueElement.classList.toggle(
            "is-warning",
            safeToSpend < 0
        );

        descriptionElement.textContent =
            safeToSpend < 0
                ? "Your planned commitments exceed your current balance."
                : "Estimated flexible spending after planned commitments.";

        balanceElement.textContent =
            formatRupiah(result.balance);

        recurringElement.textContent =
            `− ${formatRupiah(result.recurring)}`;

        budgetElement.textContent =
            `− ${formatRupiah(result.budgets)}`;

        savingsElement.textContent =
            `− ${formatRupiah(result.savings)}`;
    }

    async function calculate() {
        const [
            accounts,
            transactions,
            budgets,
            categories,
            recurringExpenses,
            goals
        ] = await Promise.all([
            VeloraDB.getAccounts(),
            VeloraDB.getTransactions(),
            VeloraDB.getBudgets(),
            VeloraDB.getCategories(),
            VeloraDB.getRecurringExpenses(),
            VeloraDB.getGoals()
        ]);

        const today = new Date();

        return {
            balance: calculateCurrentBalance(
                accounts,
                transactions
            ),

            recurring: calculateUpcomingRecurring(
                recurringExpenses,
                today
            ),

            budgets: calculateRemainingBudgets(
                budgets,
                categories,
                transactions,
                today
            ),

            savings: calculatePlannedSavings(
                goals,
                today
            )
        };
    }

    async function refresh() {
        try {
            const result = await calculate();
            render(result);
        } catch (error) {
            console.error(
                "[Velora] Safe to Spend could not be calculated:",
                error
            );
        }
    }

    function bind() {
        [
            "velora:transactions-updated",
            "velora:accounts-updated",
            "velora:budgets-updated",
            "velora:categories-updated",
            "velora:recurring-updated",
            "velora:goals-updated"
        ].forEach((eventName) => {
            window.addEventListener(
                eventName,
                refresh
            );
        });

        toggle?.addEventListener(
            "click",
            () => {
                details.hidden = !details.hidden;

                toggle.setAttribute(
                    "aria-expanded",
                    String(!details.hidden)
                );
            }
        );
    }

    async function init() {
        if (!valueElement) {
            return;
        }

        bind();
        await refresh();
    }

    const api = {
        init,
        refresh,
        calculate
    };

    window.VeloraSafeToSpend = api;

    return api;
})();

VeloraSafeToSpend.init();