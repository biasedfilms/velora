const VeloraActivity = (() => {
    const panel = document.querySelector("#activity-panel");
    const list = document.querySelector("#activity-list");
    const emptyState = document.querySelector("#activity-empty");
    const searchInput = document.querySelector("#activity-search");
    const filterButtons = document.querySelectorAll(
        "[data-activity-filter]"
    );
    const countLabel = document.querySelector("#activity-count");

    let transactions = [];
    let activeFilter = "all";

    function formatRupiah(amount) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        })
            .format(Number(amount) || 0)
            .replace(/\u00a0/g, " ");
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(
            new Date(
                `${date}T00:00:00`
            )
        );
    }

    function formatGroupDate(date) {
        const value =
            new Date(
                `${date}T00:00:00`
            );

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        const yesterday =
            new Date(today);

        yesterday.setDate(
            yesterday.getDate() -
                1
        );

        const transactionDate =
            new Date(value);

        transactionDate.setHours(
            0,
            0,
            0,
            0
        );

        if (
            transactionDate.getTime() ===
            today.getTime()
        ) {
            return "Today";
        }

        if (
            transactionDate.getTime() ===
            yesterday.getTime()
        ) {
            return "Yesterday";
        }

        return new Intl.DateTimeFormat(
            "en-US",
            {
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        ).format(value);
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

    function getFilteredTransactions() {
        const query =
            searchInput?.value
                .trim()
                .toLowerCase() ??
            "";

        return transactions.filter(
            (transaction) => {
                if (
                    activeFilter !==
                        "all" &&
                    transaction.type !==
                        activeFilter
                ) {
                    return false;
                }

                if (!query) {
                    return true;
                }

                const searchable = [
                    transaction.category,
                    transaction.account,
                    transaction.description,
                    transaction.date,
                    transaction.type
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(
                    query
                );
            }
        );
    }

    function groupByDate(items) {
        return items.reduce(
            (groups, transaction) => {
                const date =
                    transaction.date;

                if (
                    !groups.has(date)
                ) {
                    groups.set(
                        date,
                        []
                    );
                }

                groups
                    .get(date)
                    .push(
                        transaction
                    );

                return groups;
            },
            new Map()
        );
    }

    function transactionTemplate(
        transaction
    ) {
        const isIncome =
            transaction.type ===
            "income";

        const metadata = [
            transaction.account,
            transaction.description
        ]
            .filter(Boolean)
            .join(" · ");

        return `
            <article
                class="activity-transaction"
                data-transaction-id="${escapeHtml(
                    transaction.id
                )}"
            >
                <div
                    class="activity-transaction-icon ${
                        isIncome
                            ? "is-income"
                            : "is-expense"
                    }"
                >
                    ${isIncome ? "+" : "−"}
                </div>

                <div class="activity-transaction-details">
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
                        ${formatDate(
                            transaction.date
                        )}
                    </time>
                </div>

                <strong
                    class="activity-transaction-amount ${
                        isIncome
                            ? "positive"
                            : "negative"
                    }"
                >
                    ${isIncome ? "+" : "−"}
                    ${formatRupiah(
                        transaction.amount
                    )}
                </strong>

                <div class="activity-transaction-actions">
                    <button
                        class="icon-button small-icon"
                        type="button"
                        data-edit-activity="${escapeHtml(
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
                        data-delete-activity="${escapeHtml(
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

    function render() {
        const filtered =
            getFilteredTransactions();

        countLabel.textContent =
            `${filtered.length} ${
                filtered.length === 1
                    ? "transaction"
                    : "transactions"
            }`;

        emptyState.hidden =
            filtered.length !== 0;

        if (
            !filtered.length
        ) {
            list.innerHTML =
                "";

            return;
        }

        const groups =
            groupByDate(
                filtered
            );

        list.innerHTML =
            [...groups.entries()]
                .map(
                    (
                        [date, items]
                    ) => `
                        <section class="activity-date-group">
                            <div class="activity-date-heading">
                                <span>
                                    ${formatGroupDate(
                                        date
                                    )}
                                </span>

                                <span>
                                    ${items.length}
                                </span>
                            </div>

                            <div class="activity-date-list">
                                ${items
                                    .map(
                                        transactionTemplate
                                    )
                                    .join("")}
                            </div>
                        </section>
                    `
                )
                .join("");
    }

    async function refresh() {
        try {
            transactions =
                await VeloraDB.getTransactions();

            transactions.sort(
                (
                    first,
                    second
                ) =>
                    new Date(
                        second.date
                    ) -
                        new Date(
                            first.date
                        ) ||
                    (
                        second.createdAt ??
                        0
                    ) -
                        (
                            first.createdAt ??
                            0
                        )
            );

            render();
        } catch (error) {
            console.error(
                "[Velora] Activity could not be loaded:",
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

        if (visible) {
            refresh();
        }
    }

    function bind() {
        searchInput?.addEventListener(
            "input",
            render
        );

        filterButtons.forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    () => {
                        activeFilter =
                            button.dataset
                                .activityFilter;

                        filterButtons.forEach(
                            (item) => {
                                item.classList.toggle(
                                    "is-active",
                                    item ===
                                        button
                                );
                            }
                        );

                        render();
                    }
                );
            }
        );

        list.addEventListener(
            "click",
            async (event) => {
                const editButton =
                    event.target.closest(
                        "[data-edit-activity]"
                    );

                const deleteButton =
                    event.target.closest(
                        "[data-delete-activity]"
                    );

                if (editButton) {
                    const id =
                        editButton.dataset
                            .editActivity;

                    const transaction =
                        await VeloraDB.getTransaction(
                            id
                        );

                    if (
                        transaction
                    ) {
                        window.VeloraTransactions?.openSheet(
                            transaction,
                            editButton
                        );
                    }
                }

                if (deleteButton) {
                    window.VeloraTransactions?.openDelete(
                        deleteButton.dataset
                            .deleteActivity,
                        deleteButton
                    );
                }
            }
        );

        window.addEventListener(
            "velora:transactions-updated",
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

    window.VeloraActivity =
        api;

    return api;
})();

VeloraActivity.init();