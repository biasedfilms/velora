const VeloraCalendar = (() => {
    const panel = document.querySelector("#calendar-panel");
    const grid = document.querySelector("#calendar-grid");
    const monthLabel = document.querySelector("#calendar-month-label");
    const selectedDateLabel = document.querySelector("#calendar-selected-date");
    const dayList = document.querySelector("#calendar-day-list");
    const dayEmpty = document.querySelector("#calendar-day-empty");
    const previousButton = document.querySelector("#previous-calendar-month");
    const nextButton = document.querySelector("#next-calendar-month");
    const todayButton = document.querySelector("#today-calendar");

    const timelineList = document.querySelector("#financial-timeline-list");
    const timelineEmpty = document.querySelector("#financial-timeline-empty");

    let currentMonth = new Date();
    let selectedDate = new Date();

    let transactions = [];
    let recurringExpenses = [];
    let goals = [];

    function dateValue(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
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

    function selectedDateLabelValue(date) {
        return new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
        }).format(date);
    }

    function timelineDateLabel(date) {
        return new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric"
        }).format(date);
    }

    function timelineFullDateLabel(date) {
        return new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric"
        }).format(date);
    }

    function formatRupiah(amount) {
        if (window.VeloraFormat?.rupiah) {
            return window.VeloraFormat.rupiah(amount);
        }

        return `Rp ${Number(amount || 0).toLocaleString("id-ID")}`;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#039;"
        }[character]));
    }

    function getCalendarDays(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstWeekday = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const days = [];

        for (let index = firstWeekday - 1; index >= 0; index -= 1) {
            const previousDate = new Date(year, month, -index);

            days.push({
                date: previousDate,
                isCurrentMonth: false
            });
        }

        for (let day = 1; day <= totalDays; day += 1) {
            days.push({
                date: new Date(year, month, day),
                isCurrentMonth: true
            });
        }

        let trailingDay = 1;

        while (days.length % 7 !== 0) {
            days.push({
                date: new Date(year, month + 1, trailingDay),
                isCurrentMonth: false
            });

            trailingDay += 1;
        }

        return days;
    }

    function getTransactionsForDate(value) {
        return transactions.filter(
            (transaction) =>
                transaction.date === value
        );
    }

    function addFrequency(date, frequency) {
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

    function getRecurringDatesForMonth(expense, date) {
        if (
            !expense.active ||
            !expense.startDate
        ) {
            return [];
        }

        const monthStart = new Date(
            date.getFullYear(),
            date.getMonth(),
            1
        );

        const monthEnd = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0
        );

        let occurrence =
            new Date(
                `${expense.startDate}T00:00:00`
            );

        if (Number.isNaN(occurrence.getTime())) {
            return [];
        }

        let guard = 0;

        while (
            occurrence < monthStart &&
            guard < 1000
        ) {
            occurrence = addFrequency(
                occurrence,
                expense.frequency
            );

            guard += 1;
        }

        const dates = [];

        while (
            occurrence <= monthEnd &&
            guard < 1000
        ) {
            if (
                occurrence >= monthStart &&
                occurrence <= monthEnd
            ) {
                dates.push(
                    dateValue(occurrence)
                );
            }

            occurrence = addFrequency(
                occurrence,
                expense.frequency
            );

            guard += 1;
        }

        return dates;
    }

    function getRecurringForDate(value) {
        return recurringExpenses.filter(
            (expense) =>
                getRecurringDatesForMonth(
                    expense,
                    new Date(
                        `${value}T00:00:00`
                    )
                ).includes(value)
        );
    }

    function getRecurringEventsForMonth() {
        const events = [];

        recurringExpenses.forEach((expense) => {
            getRecurringDatesForMonth(
                expense,
                currentMonth
            ).forEach((date) => {
                events.push({
                    date,
                    type: "recurring",
                    title:
                        expense.name ||
                        "Recurring expense",
                    meta: "Scheduled recurring expense",
                    amount:
                        Number(
                            expense.amount
                        ) || 0
                });
            });
        });

        return events;
    }

    function getGoalEventsForMonth() {
        const selectedMonth = monthValue(
            currentMonth
        );

        return goals
            .filter(
                (goal) =>
                    goal.targetDate?.slice(0, 7) ===
                    selectedMonth
            )
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
                              (current / target) *
                                  100,
                              100
                          )
                        : 0;

                return {
                    date:
                        goal.targetDate,
                    type: "goal",
                    title:
                        goal.name ||
                        "Savings goal",
                    meta:
                        progress >= 100
                            ? "Goal target reached"
                            : `${Math.round(
                                  progress
                              )}% funded · target date`,
                    amount: null
                };
            });
    }

    function hasIncome(items) {
        return items.some(
            (item) =>
                item.type === "income"
        );
    }

    function hasExpense(items) {
        return items.some(
            (item) =>
                item.type === "expense"
        );
    }

    function dayTemplate(item) {
        const value =
            dateValue(item.date);

        const isToday =
            value ===
            dateValue(new Date());

        const isSelected =
            value ===
            dateValue(selectedDate);

        const dayTransactions =
            getTransactionsForDate(
                value
            );

        const dayRecurring =
            getRecurringForDate(
                value
            );

        const showIncome =
            hasIncome(
                dayTransactions
            );

        const showExpense =
            hasExpense(
                dayTransactions
            ) ||
            dayRecurring.length > 0;

        return `
            <button
                class="calendar-day${item.isCurrentMonth ? "" : " is-outside-month"}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}"
                type="button"
                data-calendar-date="${value}"
                aria-label="${selectedDateLabelValue(item.date)}"
                aria-pressed="${isSelected}"
            >
                <span class="calendar-day-number">
                    ${item.date.getDate()}
                </span>

                ${
                    showIncome || showExpense
                        ? `
                            <span
                                class="calendar-day-indicators"
                                aria-hidden="true"
                            >
                                ${
                                    showIncome
                                        ? '<span class="calendar-indicator is-income"></span>'
                                        : ""
                                }

                                ${
                                    showExpense
                                        ? '<span class="calendar-indicator is-expense"></span>'
                                        : ""
                                }
                            </span>
                        `
                        : ""
                }
            </button>
        `;
    }

    function renderGrid() {
        monthLabel.textContent =
            monthLabelValue(
                currentMonth
            );

        grid.innerHTML =
            getCalendarDays(
                currentMonth
            )
                .map(dayTemplate)
                .join("");
    }

    function transactionTemplate(
        transaction
    ) {
        const isIncome =
            transaction.type === "income";

        const sign =
            isIncome ? "+" : "−";

        const metadata = [
            transaction.description,
            transaction.account
        ]
            .filter(Boolean)
            .join(" · ");

        return `
            <article
                class="calendar-day-transaction"
            >
                <div
                    class="calendar-transaction-icon ${
                        isIncome
                            ? "is-income"
                            : "is-expense"
                    }"
                    aria-hidden="true"
                >
                    ${sign}
                </div>

                <div class="calendar-transaction-details">
                    <strong>
                        ${escapeHtml(
                            transaction.category ||
                                "Uncategorized"
                        )}
                    </strong>

                    ${
                        metadata
                            ? `
                                <span>
                                    ${escapeHtml(
                                        metadata
                                    )}
                                </span>
                            `
                            : ""
                    }
                </div>

                <strong
                    class="calendar-transaction-amount ${
                        isIncome
                            ? "positive"
                            : "negative"
                    }"
                >
                    ${sign}
                    ${escapeHtml(
                        formatRupiah(
                            transaction.amount
                        )
                    )}
                </strong>
            </article>
        `;
    }

    function recurringTemplate(
        expense
    ) {
        return `
            <article
                class="calendar-day-transaction is-recurring"
            >
                <div
                    class="calendar-transaction-icon is-recurring"
                    aria-hidden="true"
                >
                    ↻
                </div>

                <div class="calendar-transaction-details">
                    <strong>
                        ${escapeHtml(
                            expense.name ||
                                "Recurring expense"
                        )}
                    </strong>

                    <span>
                        Recurring expense
                    </span>
                </div>

                <strong
                    class="calendar-transaction-amount negative"
                >
                    −
                    ${escapeHtml(
                        formatRupiah(
                            expense.amount
                        )
                    )}
                </strong>
            </article>
        `;
    }

    function renderSelectedDay() {
        const value =
            dateValue(
                selectedDate
            );

        const selectedTransactions =
            getTransactionsForDate(
                value
            );

        const selectedRecurring =
            getRecurringForDate(
                value
            );

        selectedDateLabel.textContent =
            selectedDateLabelValue(
                selectedDate
            );

        const content = [
            ...selectedTransactions.map(
                transactionTemplate
            ),
            ...selectedRecurring.map(
                recurringTemplate
            )
        ];

        dayList.innerHTML =
            content.join("");

        dayList.hidden =
            content.length === 0;

        dayEmpty.hidden =
            content.length !== 0;
    }

    function getTimelineEvents() {
        const events = [];

        transactions
            .filter(
                (transaction) =>
                    transaction.date?.slice(
                        0,
                        7
                    ) === monthValue(
                        currentMonth
                    )
            )
            .forEach((transaction) => {
                events.push({
                    date:
                        transaction.date,
                    type:
                        transaction.type ===
                        "income"
                            ? "income"
                            : "expense",
                    title:
                        transaction.category ||
                        "Uncategorized",
                    meta:
                        [
                            transaction.description,
                            transaction.account
                        ]
                            .filter(Boolean)
                            .join(" · ") ||
                        (
                            transaction.type ===
                            "income"
                                ? "Income"
                                : "Expense"
                        ),
                    amount:
                        Number(
                            transaction.amount
                        ) || 0
                });
            });

        events.push(
            ...getRecurringEventsForMonth()
        );

        events.push(
            ...getGoalEventsForMonth()
        );

        const order = {
            income: 0,
            expense: 1,
            recurring: 2,
            goal: 3
        };

        return events.sort(
            (first, second) =>
                first.date.localeCompare(
                    second.date
                ) ||
                order[first.type] -
                    order[second.type]
        );
    }

    function timelineEventTemplate(
        event
    ) {
        let value = "";

        if (event.type === "income") {
            value =
                `+ ${formatRupiah(
                    event.amount
                )}`;
        } else if (
            event.type === "expense" ||
            event.type === "recurring"
        ) {
            value =
                `− ${formatRupiah(
                    event.amount
                )}`;
        }

        return `
            <article
                class="timeline-event is-${event.type}"
            >
                <span
                    class="timeline-event-marker"
                    aria-hidden="true"
                ></span>

                <div class="timeline-event-copy">
                    <strong>
                        ${escapeHtml(
                            event.title
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            event.meta
                        )}
                    </span>
                </div>

                ${
                    value
                        ? `
                            <strong
                                class="timeline-event-value ${
                                    event.type ===
                                    "income"
                                        ? "positive"
                                        : ""
                                }"
                            >
                                ${escapeHtml(
                                    value
                                )}
                            </strong>
                        `
                        : `
                            <span
                                class="timeline-event-value timeline-event-meta"
                            >
                                ${escapeHtml(
                                    event.meta
                                )}
                            </span>
                        `
                }
            </article>
        `;
    }

    function renderTimeline() {
        if (
            !timelineList ||
            !timelineEmpty
        ) {
            return;
        }

        const events =
            getTimelineEvents();

        if (!events.length) {
            timelineList.innerHTML = "";
            timelineList.hidden = true;
            timelineEmpty.hidden = false;
            return;
        }

        const groups = [];
        const groupMap = new Map();

        events.forEach((event) => {
            if (!groupMap.has(event.date)) {
                const group = {
                    date: event.date,
                    events: []
                };

                groupMap.set(
                    event.date,
                    group
                );

                groups.push(group);
            }

            groupMap
                .get(event.date)
                .events.push(event);
        });

        timelineList.innerHTML =
            groups
                .map((group) => {
                    const date =
                        new Date(
                            `${group.date}T00:00:00`
                        );

                    const dayLabel =
                        timelineFullDateLabel(
                            date
                        );

                    return `
                        <section
                            class="timeline-day"
                        >
                            <div class="timeline-date">
                                <strong>
                                    ${escapeHtml(
                                        dayLabel
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        timelineDateLabel(
                                            date
                                        )
                                    )}
                                </span>
                            </div>

                            <div class="timeline-events">
                                ${group.events
                                    .map(
                                        timelineEventTemplate
                                    )
                                    .join("")}
                            </div>
                        </section>
                    `;
                })
                .join("");

        timelineList.hidden = false;
        timelineEmpty.hidden = true;
    }

    function selectDate(value) {
        const date =
            new Date(
                `${value}T00:00:00`
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return;
        }

        selectedDate = date;

        if (
            monthValue(
                selectedDate
            ) !==
            monthValue(
                currentMonth
            )
        ) {
            currentMonth =
                new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    1
                );

            renderGrid();
            renderTimeline();
        }

        renderSelectedDay();
    }

    function changeMonth(
        offset
    ) {
        currentMonth =
            new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() +
                    offset,
                1
            );

        selectedDate =
            new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                1
            );

        renderGrid();
        renderSelectedDay();
        renderTimeline();
    }

    function goToToday() {
        const today =
            new Date();

        currentMonth =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

        selectedDate =
            new Date(today);

        renderGrid();
        renderSelectedDay();
        renderTimeline();
    }

    async function loadData() {
        [
            transactions,
            recurringExpenses,
            goals
        ] = await Promise.all([
            VeloraDB.getTransactions(),
            VeloraDB.getRecurringExpenses(),
            VeloraDB.getGoals()
        ]);
    }

    async function refresh() {
        try {
            await loadData();

            renderGrid();
            renderSelectedDay();
            renderTimeline();
        } catch (error) {
            console.error(
                "[Velora] Calendar data could not be loaded:",
                error
            );

            grid.innerHTML = "";
            dayList.innerHTML = "";
            dayList.hidden = true;
            dayEmpty.hidden = false;

            if (timelineList) {
                timelineList.innerHTML = "";
                timelineList.hidden = true;
            }

            if (timelineEmpty) {
                timelineEmpty.hidden = false;
            }
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

        if (visible) {
            refresh();
        }
    }

    function bind() {
        previousButton.addEventListener(
            "click",
            () => changeMonth(-1)
        );

        nextButton.addEventListener(
            "click",
            () => changeMonth(1)
        );

        todayButton.addEventListener(
            "click",
            goToToday
        );

        grid.addEventListener(
            "click",
            (event) => {
                const button =
                    event.target.closest(
                        "[data-calendar-date]"
                    );

                if (!button) {
                    return;
                }

                selectDate(
                    button.dataset
                        .calendarDate
                );
            }
        );

        window.addEventListener(
            "velora:transactions-updated",
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
        if (
            !panel ||
            !grid
        ) {
            return;
        }

        bind();
        await refresh();
    }

    const api = {
        init,
        refresh,
        renderGrid,
        renderSelectedDay,
        renderTimeline,
        setVisible
    };

    window.VeloraCalendar =
        api;

    return api;
})();

VeloraCalendar.init();