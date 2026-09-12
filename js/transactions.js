const VeloraTransactions = (() => {
    const form = document.querySelector("#transaction-form");
    const sheet = document.querySelector("#transaction-sheet");
    const backdrop = document.querySelector("#transaction-backdrop");
    const amountInput = document.querySelector("#transaction-amount");
    const dateInput = document.querySelector("#transaction-date");
    const message = document.querySelector("#transaction-form-message");

    const deleteDialog = document.querySelector("#delete-dialog");
    const deleteCancelButton = document.querySelector("#cancel-delete");
    const deleteConfirmButton = document.querySelector("#confirm-delete");

    let editingId = null;
    let transactionToDelete = null;
    let returnFocus = null;

    let categories = [];
    let accounts = [];

    function formatRupiah(amount) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        })
            .format(Number(amount) || 0)
            .replace(/\u00a0/g, " ");
    }

    function formatAmountInput(amount) {
        if (
            amount === "" ||
            amount === null ||
            amount === undefined
        ) {
            return "";
        }

        return formatRupiah(amount).replace(
            /^Rp\s?/,
            ""
        );
    }

    function formatAmountWhileTyping(event) {
        const input = event.currentTarget;
        const caret = input.selectionStart ?? input.value.length;

        const digitsBeforeCaret =
            input.value
                .slice(0, caret)
                .replace(/\D/g, "")
                .length;

        const digits =
            input.value.replace(
                /\D/g,
                ""
            );

        if (!digits) {
            input.value = "";
            return;
        }

        const formatted =
            formatAmountInput(
                Number(digits)
            );

        input.value =
            formatted;

        let nextCaret = 0;
        let seenDigits = 0;

        while (
            nextCaret <
                formatted.length &&
            seenDigits <
                digitsBeforeCaret
        ) {
            if (
                /\d/.test(
                    formatted[nextCaret]
                )
            ) {
                seenDigits += 1;
            }

            nextCaret += 1;
        }

        input.setSelectionRange(
            nextCaret,
            nextCaret
        );
    }

    function formatDate(date) {
        if (!date) {
            return "";
        }

        const value =
            new Date(
                `${date}T00:00:00`
            );

        if (
            Number.isNaN(
                value.getTime()
            )
        ) {
            return date;
        }

        return new Intl.DateTimeFormat(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(value);
    }

    function today() {
        const date =
            new Date();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );

        return `${date.getFullYear()}-${month}-${day}`;
    }

    function makeId() {
        return (
            window.crypto?.randomUUID?.() ??
            `transaction-${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`
        );
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

    function setMessage(text = "") {
        message.textContent =
            text;

        message.hidden =
            !text;
    }

    function getCheckedValue(name) {
        const checked =
            form.querySelector(
                `input[name="${name}"]:checked`
            );

        return checked?.value ??
            "";
    }

    function setCheckedValue(
        name,
        value
    ) {
        const inputs =
            form.querySelectorAll(
                `input[name="${name}"]`
            );

        inputs.forEach(
            (input) => {
                input.checked =
                    input.value ===
                    value;
            }
        );
    }

    function renderCategoryOptions(
        selected = ""
    ) {
        const container =
            document.querySelector(
                "#category-options"
            );

        if (!container) {
            return;
        }

        container.innerHTML =
            categories
                .map(
                    (category) => `
                        <label>
                            <input
                                type="radio"
                                name="category"
                                value="${escapeHtml(
                                    category.name
                                )}"
                                ${
                                    category.name ===
                                    selected
                                        ? "checked"
                                        : ""
                                }
                            >

                            <span>
                                ${escapeHtml(
                                    category.icon ||
                                    category.name
                                )}
                            </span>
                        </label>
                    `
                )
                .join("");

        if (
            !selected &&
            categories.length
        ) {
            container
                .querySelector(
                    'input[name="category"]'
                )
                ?.click();
        }
    }

    function renderAccountOptions(
        selected = ""
    ) {
        const select =
            document.querySelector(
                "#transaction-account"
            );

        if (!select) {
            return;
        }

        select.innerHTML = `
            <option value="">
                No account
            </option>

            ${accounts
                .map(
                    (account) => `
                        <option
                            value="${escapeHtml(
                                account.name
                            )}"
                            ${
                                account.name ===
                                selected
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

    async function loadCategories() {
        categories =
            await VeloraDB.getCategories();

        renderCategoryOptions(
            getCheckedValue(
                "category"
            )
        );
    }

    async function loadAccounts() {
        accounts =
            await VeloraDB.getAccounts();

        renderAccountOptions(
            form.elements.account?.value ??
            ""
        );
    }

    function setType(
        type
    ) {
        setCheckedValue(
            "type",
            type
        );
    }

    function setFormValues(
        transaction = null
    ) {
        form.reset();

        const type =
            transaction?.type ??
            "expense";

        const category =
            transaction?.category ??
            categories[0]?.name ??
            "";

        const account =
            transaction?.account ??
            "";

        setType(
            type
        );

        renderCategoryOptions(
            category
        );

        renderAccountOptions(
            account
        );

        amountInput.value =
            formatAmountInput(
                transaction?.amount ??
                ""
            );

        dateInput.value =
            transaction?.date ??
            today();

        if (
            form.elements.account
        ) {
            form.elements.account.value =
                account;
        }

        if (
            form.elements.description
        ) {
            form.elements.description.value =
                transaction?.description ??
                "";
        }

        setCheckedValue(
            "category",
            category
        );

        const moreOptions =
            form.querySelector(
                ".more-options"
            );

        if (moreOptions) {
            moreOptions.open =
                Boolean(
                    transaction?.account ||
                    transaction?.description
                );
        }
    }

    function openSheet(
        transaction = null,
        trigger = null
    ) {
        editingId =
            transaction?.id ??
            null;

        returnFocus =
            trigger ??
            document.activeElement;

        const eyebrow =
            document.querySelector(
                "#transaction-sheet-eyebrow"
            );

        const title =
            document.querySelector(
                "#transaction-sheet-title"
            );

        if (eyebrow) {
            eyebrow.textContent =
                transaction
                    ? "EDIT TRANSACTION"
                    : "NEW TRANSACTION";
        }

        if (title) {
            title.textContent =
                transaction
                    ? "Edit transaction"
                    : "Add transaction";
        }

        setFormValues(
            transaction
        );

        setMessage();

        backdrop.hidden =
            false;

        sheet.hidden =
            false;

        document.body.classList.add(
            "modal-open"
        );

        requestAnimationFrame(
            () => {
                amountInput.focus();
            }
        );
    }

    function closeSheet() {
        sheet.hidden =
            true;

        backdrop.hidden =
            true;

        document.body.classList.remove(
            "modal-open"
        );

        setMessage();

        editingId =
            null;

        returnFocus?.focus();
        returnFocus =
            null;
    }

    function openDelete(
        id,
        trigger = null
    ) {
        if (
            !id ||
            !deleteDialog
        ) {
            return;
        }

        transactionToDelete =
            id;

        returnFocus =
            trigger ??
            document.activeElement;

        deleteDialog.hidden =
            false;

        document.body.classList.add(
            "modal-open"
        );

        requestAnimationFrame(
            () =>
                deleteConfirmButton.focus()
        );
    }

    function closeDelete() {
        transactionToDelete =
            null;

        deleteDialog.hidden =
            true;

        document.body.classList.remove(
            "modal-open"
        );

        returnFocus?.focus();
        returnFocus =
            null;
    }

    function parseAmount(
        value
    ) {
        const normalized =
            String(
                value ??
                ""
            )
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    /,/g,
                    ""
                )
                .trim();

        if (!normalized) {
            return 0;
        }

        return Number(
            normalized
        );
    }

    function validate(
        values
    ) {
        if (
            !Number.isFinite(
                values.amount
            ) ||
            values.amount <= 0
        ) {
            return "Enter an amount greater than zero.";
        }

        if (
            values.type !==
                "income" &&
            values.type !==
                "expense"
        ) {
            return "Choose Income or Expense.";
        }

        if (
            !values.category
        ) {
            return "Choose a category.";
        }

        if (
            !values.date
        ) {
            return "Choose a date.";
        }

        const parsedDate =
            new Date(
                `${values.date}T00:00:00`
            );

        if (
            Number.isNaN(
                parsedDate.getTime()
            )
        ) {
            return "Choose a valid date.";
        }

        return "";
    }

    function readForm() {
        const data =
            new FormData(
                form
            );

        return {
            type:
                String(
                    data.get(
                        "type"
                    ) ??
                    ""
                ),

            amount:
                parseAmount(
                    data.get(
                        "amount"
                    )
                ),

            category:
                String(
                    data.get(
                        "category"
                    ) ??
                    ""
                ).trim(),

            account:
                String(
                    data.get(
                        "account"
                    ) ??
                    ""
                ).trim(),

            date:
                String(
                    data.get(
                        "date"
                    ) ??
                    ""
                ),

            description:
                String(
                    data.get(
                        "description"
                    ) ??
                    ""
                ).trim()
        };
    }

    async function save(
        event
    ) {
        event.preventDefault();

        const values =
            readForm();

        const error =
            validate(
                values
            );

        if (error) {
            setMessage(
                error
            );

            return;
        }

        const now =
            Date.now();

        try {
            if (
                editingId
            ) {
                const existing =
                    await VeloraDB.getTransaction(
                        editingId
                    );

                if (!existing) {
                    setMessage(
                        "This transaction no longer exists."
                    );

                    return;
                }

                await VeloraDB.updateTransaction({
                    ...existing,
                    ...values,
                    id:
                        existing.id,
                    createdAt:
                        existing.createdAt ??
                        now,
                    updatedAt:
                        now
                });
            } else {
                await VeloraDB.addTransaction({
                    ...values,
                    id:
                        makeId(),
                    createdAt:
                        now,
                    updatedAt:
                        now
                });
            }

            closeSheet();

            window.dispatchEvent(
                new CustomEvent(
                    "velora:transactions-updated"
                )
            );
        } catch (error) {
            console.error(
                "[Velora] Transaction save failed:",
                error
            );

            setMessage(
                "This transaction could not be saved. Please try again."
            );
        }
    }

    async function confirmDelete() {
        if (
            !transactionToDelete
        ) {
            return;
        }

        try {
            await VeloraDB.deleteTransaction(
                transactionToDelete
            );

            closeDelete();

            window.dispatchEvent(
                new CustomEvent(
                    "velora:transactions-updated"
                )
            );
        } catch (error) {
            console.error(
                "[Velora] Transaction delete failed:",
                error
            );
        }
    }

    async function render() {
        const list =
            document.querySelector(
                "#transaction-list"
            );

        const emptyState =
            document.querySelector(
                "#transaction-empty-state"
            );

        if (
            !list ||
            !emptyState
        ) {
            return;
        }

        try {
            const transactions =
                await VeloraDB.getTransactions();

            list.innerHTML =
                transactions
                    .map(
                        (transaction) => {
                            const income =
                                transaction.type ===
                                "income";

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
                                        ${
                                            income
                                                ? "+"
                                                : "−"
                                        }
                                    </div>

                                    <div class="transaction-details">
                                        <strong>
                                            ${escapeHtml(
                                                transaction.category ||
                                                "Uncategorized"
                                            )}
                                        </strong>

                                        ${
                                            transaction.description ||
                                            transaction.account
                                                ? `
                                                    <span>
                                                        ${escapeHtml(
                                                            [
                                                                transaction.description,
                                                                transaction.account
                                                            ]
                                                                .filter(
                                                                    Boolean
                                                                )
                                                                .join(
                                                                    " · "
                                                                )
                                                        )}
                                                    </span>
                                                `
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
                                        class="transaction-amount ${
                                            income
                                                ? "positive"
                                                : "negative"
                                        }"
                                    >
                                        ${
                                            income
                                                ? "+"
                                                : "−"
                                        }
                                        ${formatRupiah(
                                            transaction.amount
                                        )}
                                    </strong>

                                    <div class="transaction-actions">
                                        <button
                                            class="icon-button small-icon"
                                            type="button"
                                            data-edit-id="${escapeHtml(
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
                                            data-delete-id="${escapeHtml(
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
                    )
                    .join("");

            list.hidden =
                transactions.length ===
                0;

            emptyState.hidden =
                transactions.length !==
                0;
        } catch (error) {
            console.error(
                "[Velora] Transactions could not be loaded:",
                error
            );
        }
    }

    function bind() {
        document
            .querySelectorAll(
                "[data-open-transaction], #add-transaction"
            )
            .forEach(
                (button) => {
                    button.addEventListener(
                        "click",
                        () =>
                            openSheet(
                                null,
                                button
                            )
                    );
                }
            );

        document
            .querySelector(
                "#close-transaction"
            )
            ?.addEventListener(
                "click",
                closeSheet
            );

        document
            .querySelector(
                "#cancel-transaction"
            )
            ?.addEventListener(
                "click",
                closeSheet
            );

        backdrop?.addEventListener(
            "click",
            closeSheet
        );

        form.addEventListener(
            "submit",
            save
        );

        amountInput.addEventListener(
            "input",
            formatAmountWhileTyping
        );

        form.addEventListener(
            "change",
            (event) => {
                if (
                    event.target.matches(
                        'input[name="type"]'
                    )
                ) {
                    setMessage();
                }

                if (
                    event.target.matches(
                        'input[name="category"]'
                    )
                ) {
                    setMessage();
                }
            }
        );

        deleteCancelButton?.addEventListener(
            "click",
            closeDelete
        );

        deleteConfirmButton?.addEventListener(
            "click",
            confirmDelete
        );

        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key ===
                        "Escape" &&
                    sheet &&
                    !sheet.hidden
                ) {
                    closeSheet();
                    return;
                }

                if (
                    event.key ===
                        "Escape" &&
                    deleteDialog &&
                    !deleteDialog.hidden
                ) {
                    closeDelete();
                }
            }
        );

        window.addEventListener(
            "velora:categories-updated",
            async (event) => {
                categories =
                    Array.isArray(
                        event.detail
                    )
                        ? event.detail
                        : await VeloraDB.getCategories();

                renderCategoryOptions(
                    getCheckedValue(
                        "category"
                    )
                );
            }
        );

        window.addEventListener(
            "velora:accounts-updated",
            async (event) => {
                accounts =
                    Array.isArray(
                        event.detail
                    )
                        ? event.detail
                        : await VeloraDB.getAccounts();

                renderAccountOptions(
                    form.elements.account?.value ??
                    ""
                );
            }
        );

        document.addEventListener(
            "click",
            (event) => {
                const editButton =
                    event.target.closest(
                        "[data-edit-id]"
                    );

                const deleteButton =
                    event.target.closest(
                        "[data-delete-id]"
                    );

                if (
                    editButton
                ) {
                    VeloraDB.getTransaction(
                        editButton.dataset
                            .editId
                    ).then(
                        (transaction) => {
                            if (
                                transaction
                            ) {
                                openSheet(
                                    transaction,
                                    editButton
                                );
                            }
                        }
                    );
                }

                if (
                    deleteButton
                ) {
                    openDelete(
                        deleteButton.dataset
                            .deleteId,
                        deleteButton
                    );
                }
            }
        );
    }

    async function init() {
        if (
            !form ||
            !sheet
        ) {
            return;
        }

        try {
            if (
                window.VeloraCategories?.ready
            ) {
                await window.VeloraCategories.ready;
            }

            await Promise.all([
                loadCategories(),
                loadAccounts()
            ]);

            bind();
            await render();
        } catch (error) {
            console.error(
                "[Velora] Transaction module could not initialize:",
                error
            );

            setMessage(
                "The transaction form could not initialize."
            );
        }
    }

    window.VeloraFormat = {
        rupiah: formatRupiah,
        date: formatDate,
        amount: formatAmountInput,
        whileTyping:
            formatAmountWhileTyping
    };

    const api = {
        init,
        render,
        refresh: async () => {
            await Promise.all([
                loadCategories(),
                loadAccounts()
            ]);
        },
        openSheet,
        openDelete
    };

    window.VeloraTransactions =
        api;

    return api;
})();

VeloraTransactions.init();