const VeloraInsights = (() => {
    const panel = document.querySelector("#insights-panel");
    const monthLabel = document.querySelector("#insights-month-label");
    const previousButton = document.querySelector("#previous-insights-month");
    const nextButton = document.querySelector("#next-insights-month");
    const totalIncome = document.querySelector("#insights-income");
    const totalExpenses = document.querySelector("#insights-expenses");
    const netChange = document.querySelector("#insights-net");
    const comparison = document.querySelector("#insights-comparison");
    const chart = document.querySelector("#spending-trend-chart");
    const chartLabels = document.querySelector("#spending-trend-labels");
    const chartTooltip = document.querySelector("#insights-chart-tooltip");
    const trendTotal = document.querySelector("#insights-trend-total");
    const categoryList = document.querySelector("#insights-category-list");
    const insightList = document.querySelector("#insights-personalized-list");
    const insightEmpty = document.querySelector("#insights-personalized-empty");
    const emptyState = document.querySelector("#insights-empty");

    let transactions = [];
    let budgets = [];
    let categories = [];
    let recurringExpenses = [];
    let goals = [];
    let selectedMonth = new Date();

    function formatRupiah(amount) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(Math.round(amount)).replace(/\u00a0/g, " ");
    }

    function monthValue(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    function monthLabelValue(date) {
        return new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric"
        }).format(date);
    }

    function dateLabelValue(date) {
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric"
        }).format(date);
    }

    function getMonthTransactions(value) {
        return transactions.filter(
            (transaction) =>
                transaction.date?.slice(0, 7) === value
        );
    }

    function getMonthTotals(items) {
        return items.reduce(
            (totals, transaction) => {
                const amount =
                    Number(transaction.amount) || 0;

                if (
                    transaction.type === "income"
                ) {
                    totals.income += amount;
                } else {
                    totals.expenses += amount;
                }

                return totals;
            },
            {
                income: 0,
                expenses: 0
            }
        );
    }

    function getDaysInMonth(date) {
        return new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0
        ).getDate();
    }

    function isCurrentMonth(date) {
        const now = new Date();

        return (
            date.getFullYear() ===
                now.getFullYear() &&
            date.getMonth() ===
                now.getMonth()
        );
    }

    function getCategoryTotals(items) {
        const totals = new Map();

        items
            .filter(
                (transaction) =>
                    transaction.type ===
                    "expense"
            )
            .forEach((transaction) => {
                const category =
                    transaction.category ||
                    "Uncategorized";

                totals.set(
                    category,
                    (totals.get(category) ?? 0) +
                        (Number(transaction.amount) || 0)
                );
            });

        return totals;
    }

    function getTopCategory(items) {
        const totals =
            [...getCategoryTotals(items).entries()]
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );

        return totals[0] ?? null;
    }

    function getRecurringForMonth(date) {
        const month =
            monthValue(date);

        return recurringExpenses
            .filter(
                (expense) =>
                    expense.active &&
                    expense.startDate
            )
            .reduce(
                (total, expense) => {
                    let next =
                        new Date(
                            `${expense.startDate}T00:00:00`
                        );

                    if (
                        Number.isNaN(
                            next.getTime()
                        )
                    ) {
                        return total;
                    }

                    const monthStart =
                        new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            1
                        );

                    while (
                        next < monthStart
                    ) {
                        if (
                            expense.frequency ===
                            "weekly"
                        ) {
                            next.setDate(
                                next.getDate() +
                                    7
                            );
                        } else if (
                            expense.frequency ===
                            "yearly"
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
                    }

                    let subtotal = 0;
                    let guard = 0;

                    while (
                        monthValue(next) ===
                            month &&
                        guard < 100
                    ) {
                        subtotal +=
                            Number(
                                expense.amount
                            ) || 0;

                        guard += 1;

                        if (
                            expense.frequency ===
                            "weekly"
                        ) {
                            next.setDate(
                                next.getDate() +
                                    7
                            );
                        } else if (
                            expense.frequency ===
                            "yearly"
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
                    }

                    return (
                        total +
                        subtotal
                    );
                },
                0
            );
    }

    function getBudgetInsights(
        date,
        monthItems
    ) {
        const month =
            monthValue(date);

        return budgets
            .filter(
                (budget) =>
                    budget.month ===
                    month
            )
            .map((budget) => {
                const category =
                    categories.find(
                        (item) =>
                            item.id ===
                            budget.categoryId
                    );

                const spent =
                    monthItems.reduce(
                        (
                            total,
                            transaction
                        ) => {
                            if (
                                transaction.type ===
                                    "expense" &&
                                transaction.category ===
                                    category?.name
                            ) {
                                return (
                                    total +
                                    (Number(
                                        transaction.amount
                                    ) || 0)
                                );
                            }

                            return total;
                        },
                        0
                    );

                return {
                    budget,
                    category,
                    spent,
                    remaining:
                        (Number(
                            budget.limit
                        ) || 0) -
                        spent
                };
            });
    }

    function getGoalInsight() {
        const activeGoals =
            goals
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
                                  (current /
                                      target) *
                                      100,
                                  100
                              )
                            : 0;

                    return {
                        goal,
                        progress,
                        remaining:
                            Math.max(
                                target -
                                    current,
                                0
                            )
                    };
                })
                .filter(
                    (item) =>
                        item.remaining >
                        0
                )
                .sort(
                    (a, b) =>
                        b.progress -
                        a.progress
                );

        return (
            activeGoals[0] ??
            null
        );
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

    function renderNavigation() {
        const current =
            isCurrentMonth(
                selectedMonth
            );

        monthLabel.textContent =
            monthLabelValue(
                selectedMonth
            );

        nextButton.disabled =
            current;

        nextButton.setAttribute(
            "aria-disabled",
            String(current)
        );
    }

    function renderSummary(
        current,
        previous
    ) {
        const net =
            current.income -
            current.expenses;

        totalIncome.textContent =
            formatRupiah(
                current.income
            );

        totalExpenses.textContent =
            formatRupiah(
                current.expenses
            );

        netChange.textContent =
            formatRupiah(net);

        netChange.classList.toggle(
            "positive",
            net > 0
        );

        netChange.classList.toggle(
            "negative",
            net < 0
        );

        if (
            previous.expenses === 0 &&
            current.expenses === 0
        ) {
            comparison.textContent =
                "No spending recorded yet.";

            comparison.className =
                "insights-comparison";

            return;
        }

        if (
            previous.expenses === 0
        ) {
            comparison.textContent =
                "No spending recorded last month.";

            comparison.className =
                "insights-comparison";

            return;
        }

        const change =
            (
                (
                    current.expenses -
                    previous.expenses
                ) /
                previous.expenses
            ) *
            100;

        const rounded =
            Math.abs(change)
                .toFixed(1);

        if (change === 0) {
            comparison.textContent =
                "Unchanged from last month";

            comparison.className =
                "insights-comparison";

            return;
        }

        comparison.textContent =
            change > 0
                ? `${rounded}% higher than last month`
                : `${rounded}% lower than last month`;

        comparison.className =
            `insights-comparison ${
                change > 0
                    ? "is-up"
                    : "is-down"
            }`;
    }

    function renderChartTooltip(
        day,
        amount
    ) {
        if (
            !chartTooltip
        ) {
            return;
        }

        if (!amount) {
            chartTooltip.hidden =
                true;

            return;
        }

        const date =
            new Date(
                selectedMonth.getFullYear(),
                selectedMonth.getMonth(),
                day
            );

        chartTooltip.innerHTML = `
            <strong>
                ${dateLabelValue(date)}
            </strong>

            <span>
                ${formatRupiah(amount)}
            </span>
        `;

        chartTooltip.hidden =
            false;
    }

    function bindChartPoints() {
        chart
            .querySelectorAll(
                ".insights-chart-point"
            )
            .forEach((point) => {
                const day =
                    Number(
                        point.dataset.day
                    );

                const amount =
                    Number(
                        point.dataset.amount
                    );

                point.addEventListener(
                    "mouseenter",
                    () =>
                        renderChartTooltip(
                            day,
                            amount
                        )
                );

                point.addEventListener(
                    "mouseleave",
                    () => {
                        if (
                            chartTooltip
                        ) {
                            chartTooltip.hidden =
                                true;
                        }
                    }
                );

                point.addEventListener(
                    "focus",
                    () =>
                        renderChartTooltip(
                            day,
                            amount
                        )
                );

                point.addEventListener(
                    "blur",
                    () => {
                        if (
                            chartTooltip
                        ) {
                            chartTooltip.hidden =
                                true;
                        }
                    }
                );

                point.addEventListener(
                    "click",
                    () =>
                        renderChartTooltip(
                            day,
                            amount
                        )
                );
            });
    }

    function renderTrend(
        currentItems,
        monthDate
    ) {
        const byDay =
            new Map();

        currentItems
            .filter(
                (transaction) =>
                    transaction.type ===
                    "expense"
            )
            .forEach(
                (transaction) => {
                    const day =
                        Number(
                            transaction.date.slice(
                                -2
                            )
                        );

                    byDay.set(
                        day,
                        (
                            byDay.get(
                                day
                            ) ?? 0
                        ) +
                            (
                                Number(
                                    transaction.amount
                                ) || 0
                            )
                    );
                }
            );

        const daysInMonth =
            getDaysInMonth(
                monthDate
            );

        const values =
            Array.from(
                {
                    length:
                        daysInMonth
                },
                (_, index) =>
                    byDay.get(
                        index + 1
                    ) ?? 0
            );

        const total =
            values.reduce(
                (sum, value) =>
                    sum + value,
                0
            );

        const max =
            Math.max(
                ...values,
                1
            );

        const points =
            values.map(
                (
                    value,
                    index
                ) => {
                    const x =
                        daysInMonth ===
                        1
                            ? 50
                            : (
                                  index /
                                  (
                                      daysInMonth -
                                      1
                                  )
                              ) *
                              100;

                    const y =
                        90 -
                        (
                            value /
                            max
                        ) *
                            72;

                    return {
                        x,
                        y,
                        day:
                            index + 1,
                        amount:
                            value
                    };
                }
            );

        const pointString =
            points
                .map(
                    (point) =>
                        `${point.x.toFixed(
                            2
                        )},${point.y.toFixed(
                            2
                        )}`
                )
                .join(" ");

        const areaPoints =
            `0,90 ${pointString} 100,90`;

        chart.innerHTML = `
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label="Daily spending trend"
            >
                <defs>
                    <linearGradient
                        id="insights-chart-gradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            class="insights-gradient-start"
                        ></stop>

                        <stop
                            offset="100%"
                            class="insights-gradient-end"
                        ></stop>
                    </linearGradient>
                </defs>

                <line
                    class="insights-chart-grid"
                    x1="0"
                    y1="18"
                    x2="100"
                    y2="18"
                ></line>

                <line
                    class="insights-chart-grid"
                    x1="0"
                    y1="54"
                    x2="100"
                    y2="54"
                ></line>

                <line
                    class="insights-chart-grid"
                    x1="0"
                    y1="90"
                    x2="100"
                    y2="90"
                ></line>

                <polygon
                    class="insights-chart-area"
                    points="${areaPoints}"
                ></polygon>

                <polyline
                    class="insights-chart-path"
                    points="${pointString}"
                ></polyline>

                ${points
                    .map(
                        (
                            point
                        ) => `
                            <circle
                                class="insights-chart-point"
                                cx="${point.x}"
                                cy="${point.y}"
                                r="${
                                    point.amount
                                        ? 1.6
                                        : 1.05
                                }"
                                data-day="${
                                    point.day
                                }"
                                data-amount="${
                                    point.amount
                                }"
                                tabindex="${
                                    point.amount
                                        ? "0"
                                        : "-1"
                                }"
                                aria-label="${
                                    point.amount
                                        ? `${dateLabelValue(
                                              new Date(
                                                  monthDate.getFullYear(),
                                                  monthDate.getMonth(),
                                                  point.day
                                              )
                                          )}: ${formatRupiah(
                                              point.amount
                                          )}`
                                        : ""
                                }"
                            ></circle>
                        `
                    )
                    .join("")}
            </svg>
        `;

        trendTotal.textContent =
            formatRupiah(
                total
            );

        const labelDays =
            [
                ...new Set([
                    1,
                    Math.ceil(
                        daysInMonth /
                            4
                    ),
                    Math.ceil(
                        daysInMonth /
                            2
                    ),
                    Math.ceil(
                        (
                            daysInMonth *
                            3
                        ) /
                            4
                    ),
                    daysInMonth
                ])
            ];

        chartLabels.innerHTML =
            labelDays
                .map(
                    (day) =>
                        `<span>${day}</span>`
                )
                .join("");

        bindChartPoints();
    }

    function renderCategories(
        currentItems
    ) {
        const totals =
            [
                ...getCategoryTotals(
                    currentItems
                ).entries()
            ].sort(
                (a, b) =>
                    b[1] - a[1]
            );

        if (
            !totals.length
        ) {
            categoryList.innerHTML =
                "";

            return;
        }

        const total =
            totals.reduce(
                (
                    sum,
                    [, amount]
                ) =>
                    sum + amount,
                0
            );

        const entries =
            totals.slice(
                0,
                6
            );

        const highest =
            entries[0][1];

        categoryList.innerHTML =
            entries
                .map(
                    (
                        [
                            category,
                            amount
                        ],
                        index
                    ) => {
                        const percentOfTop =
                            highest
                                ? Math.round(
                                      (
                                          amount /
                                          highest
                                      ) *
                                          100
                                  )
                                : 0;

                        const percentOfTotal =
                            total
                                ? Math.round(
                                      (
                                          amount /
                                          total
                                      ) *
                                          100
                                  )
                                : 0;

                        return `
                            <div class="insights-category-row">
                                <div class="insights-category-meta">
                                    <div class="insights-category-name">
                                        <span class="insights-category-rank">
                                            ${index + 1}
                                        </span>

                                        <strong>
                                            ${escapeHtml(
                                                category
                                            )}
                                        </strong>
                                    </div>

                                    <div class="insights-category-value">
                                        <strong>
                                            ${formatRupiah(
                                                amount
                                            )}
                                        </strong>

                                        <span>
                                            ${percentOfTotal}%
                                        </span>
                                    </div>
                                </div>

                                <div class="insights-category-bar">
                                    <span
                                        style="width:${percentOfTop}%"
                                    ></span>
                                </div>
                            </div>
                        `;
                    }
                )
                .join("");
    }

    function renderPersonalizedInsights(
        currentItems,
        previousItems,
        currentTotals
    ) {
        const insights = [];

        const currentCategoryTotals =
            getCategoryTotals(
                currentItems
            );

        const previousCategoryTotals =
            getCategoryTotals(
                previousItems
            );

        const totalCurrentExpenses =
            currentTotals.expenses;

        const topCategory =
            getTopCategory(
                currentItems
            );

        if (
            topCategory &&
            totalCurrentExpenses > 0
        ) {
            const share =
                Math.round(
                    (
                        topCategory[1] /
                        totalCurrentExpenses
                    ) *
                        100
                );

            if (
                share >= 30
            ) {
                insights.push({
                    eyebrow:
                        "BIGGEST CATEGORY",

                    title:
                        `${topCategory[0]} leads your spending`,

                    body:
                        `${formatRupiah(
                            topCategory[1]
                        )} accounts for ${share}% of your expenses this month.`,

                    tone:
                        "neutral"
                });
            }
        }

        let biggestChange =
            null;

        currentCategoryTotals.forEach(
            (
                currentAmount,
                category
            ) => {
                const previousAmount =
                    previousCategoryTotals.get(
                        category
                    ) ?? 0;

                if (
                    previousAmount <=
                    0
                ) {
                    return;
                }

                const change =
                    (
                        (
                            currentAmount -
                            previousAmount
                        ) /
                        previousAmount
                    ) *
                    100;

                if (
                    Math.abs(change) <
                    15
                ) {
                    return;
                }

                if (
                    !biggestChange ||
                    Math.abs(change) >
                        Math.abs(
                            biggestChange.change
                        )
                ) {
                    biggestChange = {
                        category,
                        currentAmount,
                        previousAmount,
                        change
                    };
                }
            }
        );

        if (
            biggestChange
        ) {
            const amount =
                Math.abs(
                    biggestChange.currentAmount -
                        biggestChange.previousAmount
                );

            insights.push({
                eyebrow:
                    "CATEGORY CHANGE",

                title:
                    biggestChange.change >
                        0
                        ? `${biggestChange.category} spending is up`
                        : `${biggestChange.category} spending is down`,

                body:
                    `${biggestChange.category} changed by ${Math.abs(
                        biggestChange.change
                    ).toFixed(
                        1
                    )}% versus last month (${formatRupiah(
                        amount
                    )} ${
                        biggestChange.change >
                        0
                            ? "more"
                            : "less"
                    }).`,

                tone:
                    biggestChange.change >
                    0
                        ? "warning"
                        : "positive"
            });
        }

        const budgetInsights =
            getBudgetInsights(
                selectedMonth,
                currentItems
            )
                .filter(
                    (item) =>
                        item.remaining <
                        0
                )
                .sort(
                    (a, b) =>
                        a.remaining -
                        b.remaining
                );

        if (
            budgetInsights.length
        ) {
            const item =
                budgetInsights[0];

            insights.push({
                eyebrow:
                    "BUDGET",

                title:
                    `${
                        item.category
                            ?.name ??
                        "A category"
                    } is over budget`,

                body:
                    `You're ${formatRupiah(
                        Math.abs(
                            item.remaining
                        )
                    )} over the planned limit this month.`,

                tone:
                    "warning"
            });
        }

        const recurring =
            getRecurringForMonth(
                selectedMonth
            );

        if (
            recurring > 0 &&
            (
                totalCurrentExpenses ===
                    0 ||
                recurring /
                    Math.max(
                        totalCurrentExpenses,
                        1
                    ) >=
                    0.25
            )
        ) {
            insights.push({
                eyebrow:
                    "COMMITMENTS",

                title:
                    "A meaningful share is already committed",

                body:
                    `${formatRupiah(
                        recurring
                    )} in recurring expenses is scheduled this month.`,

                tone:
                    "neutral"
            });
        }

        const goalInsight =
            getGoalInsight();

        if (
            goalInsight &&
            goalInsight.progress >=
                50
        ) {
            insights.push({
                eyebrow:
                    "SAVINGS",

                title:
                    `${goalInsight.goal.name} is ${Math.round(
                        goalInsight.progress
                    )}% funded`,

                body:
                    `${formatRupiah(
                        goalInsight.remaining
                    )} remains to reach this goal.`,

                tone:
                    "positive"
            });
        }

        if (
            !insights.length
        ) {
            insights.push({
                eyebrow:
                    "LOOKING GOOD",

                title:
                    "No major spending signals",

                body:
                    "Nothing unusual stood out in your spending this month.",

                tone:
                    "positive"
            });
        }

        const visible =
            insights.slice(
                0,
                4
            );

        insightEmpty.hidden =
            true;

        insightList.innerHTML =
            visible
                .map(
                    (insight) => `
                        <article class="personalized-insight ${
                            insight.tone
                                ? `is-${insight.tone}`
                                : ""
                        }">
                            <div class="personalized-insight-marker"></div>

                            <div class="personalized-insight-copy">
                                <span class="personalized-insight-eyebrow">
                                    ${insight.eyebrow}
                                </span>

                                <h3>
                                    ${escapeHtml(
                                        insight.title
                                    )}
                                </h3>

                                <p>
                                    ${escapeHtml(
                                        insight.body
                                    )}
                                </p>
                            </div>
                        </article>
                    `
                )
                .join("");
    }

    async function render() {
        const currentMonth =
            monthValue(
                selectedMonth
            );

        const previousDate =
            new Date(
                selectedMonth.getFullYear(),
                selectedMonth.getMonth() -
                    1,
                1
            );

        const previousMonth =
            monthValue(
                previousDate
            );

        const currentItems =
            getMonthTransactions(
                currentMonth
            );

        const previousItems =
            getMonthTransactions(
                previousMonth
            );

        const current =
            getMonthTotals(
                currentItems
            );

        const previous =
            getMonthTotals(
                previousItems
            );

        renderNavigation();

        const hasData =
            currentItems.length >
                0 ||
            previousItems.length >
                0;

        emptyState.hidden =
            hasData;

        if (!hasData) {
            totalIncome.textContent =
                formatRupiah(0);

            totalExpenses.textContent =
                formatRupiah(0);

            netChange.textContent =
                formatRupiah(0);

            netChange.classList.remove(
                "positive",
                "negative"
            );

            comparison.textContent =
                "No transactions recorded for this period.";

            comparison.className =
                "insights-comparison";

            trendTotal.textContent =
                formatRupiah(0);

            chart.innerHTML =
                "";

            chartLabels.innerHTML =
                "";

            categoryList.innerHTML =
                "";

            insightList.innerHTML =
                "";

            insightEmpty.hidden =
                false;

            if (
                chartTooltip
            ) {
                chartTooltip.hidden =
                    true;
            }

            return;
        }

        renderSummary(
            current,
            previous
        );

        renderTrend(
            currentItems,
            selectedMonth
        );

        renderCategories(
            currentItems
        );

        renderPersonalizedInsights(
            currentItems,
            previousItems,
            current
        );
    }

    function changeMonth(
        offset
    ) {
        selectedMonth =
            new Date(
                selectedMonth.getFullYear(),
                selectedMonth.getMonth() +
                    offset,
                1
            );

        render();
    }

    async function refresh() {
        try {
            [
                transactions,
                budgets,
                categories,
                recurringExpenses,
                goals
            ] = await Promise.all([
                VeloraDB.getTransactions(),
                VeloraDB.getBudgets(),
                VeloraDB.getCategories(),
                VeloraDB.getRecurringExpenses(),
                VeloraDB.getGoals()
            ]);

            await render();
        } catch (error) {
            console.error(
                "[Velora] Insights could not be loaded:",
                error
            );
        }
    }

    function setVisible(
        visible
    ) {
        if (!panel) {
            return;
        }

        panel.hidden =
            !visible;

        if (
            visible
        ) {
            refresh();
        }
    }

    function bind() {
        previousButton.addEventListener(
            "click",
            () =>
                changeMonth(-1)
        );

        nextButton.addEventListener(
            "click",
            () => {
                if (
                    !isCurrentMonth(
                        selectedMonth
                    )
                ) {
                    changeMonth(1);
                }
            }
        );

        window.addEventListener(
            "velora:transactions-updated",
            refresh
        );

        window.addEventListener(
            "velora:budgets-updated",
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

        window.addEventListener(
            "velora:categories-updated",
            refresh
        );

        window.addEventListener(
            "velora:accounts-updated",
            refresh
        );
        
    }

    async function init() {
        if (!panel) {
            return;
        }

        bind();
        await refresh();
    }

    const api = {
        init,
        refresh,
        setVisible
    };

    window.VeloraInsights =
        api;

    return api;
})();

VeloraInsights.init();