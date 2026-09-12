const VeloraGoals = (() => {
    const panel = document.querySelector("#goals-panel");
    const list = document.querySelector("#goal-list");
    const emptyState = document.querySelector("#goal-empty-state");
    const sheet = document.querySelector("#goal-sheet");
    const backdrop = document.querySelector("#goal-backdrop");
    const form = document.querySelector("#goal-form");
    const nameInput = document.querySelector("#goal-name");
    const targetInput = document.querySelector("#goal-target-amount");
    const currentInput = document.querySelector("#goal-current-amount");
    const targetDateInput = document.querySelector("#goal-target-date");
    const accountSelect = document.querySelector("#goal-account");
    const message = document.querySelector("#goal-form-message");

    let goals = [];
    let accounts = [];
    let editingId = null;
    let progressOnly = false;
    let deletingId = null;
    let returnFocus = null;

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

    function makeId() {
        return window.crypto?.randomUUID?.() ??
            `goal-${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`;
    }

    function progress(goal) {
        const target = Number(goal.targetAmount) || 0;
        const current = Number(goal.currentAmount) || 0;

        if (target <= 0) {
            return 0;
        }

        return Math.min(
            (current / target) * 100,
            100
        );
    }

    function remaining(goal) {
        const target =
            Number(goal.targetAmount) || 0;

        const current =
            Number(goal.currentAmount) || 0;

        return Math.max(
            target - current,
            0
        );
    }

    function dateLabel(value) {
        if (!value) {
            return "";
        }

        return new Intl.DateTimeFormat(
            "en-US",
            {
                month: "short",
                year: "numeric"
            }
        ).format(
            new Date(
                `${value}T00:00:00`
            )
        );
    }

    function render() {
        const ordered = [...goals].sort(
            (first, second) => {
                const firstReached =
                    Number(first.currentAmount) >=
                    Number(first.targetAmount);

                const secondReached =
                    Number(second.currentAmount) >=
                    Number(second.targetAmount);

                return (
                    Number(firstReached) -
                    Number(secondReached)
                ) ||
                    first.name.localeCompare(
                        second.name
                    );
            }
        );

        list.innerHTML = ordered
            .map((goal) => {
                const account =
                    accounts.find(
                        (item) =>
                            item.id ===
                            goal.accountId
                    );

                const reached =
                    Number(goal.currentAmount) >=
                    Number(goal.targetAmount);

                const percentage =
                    Math.round(
                        progress(goal)
                    );

                return `
                    <article class="goal-row">
                        <div class="goal-row-header">
                            <div>
                                <strong>
                                    ${escapeHtml(
                                        goal.name
                                    )}
                                </strong>

                                <span>
                                    ${percentage}% ·
                                    ${window.VeloraFormat.rupiah(
                                        goal.currentAmount
                                    )}
                                    /
                                    ${window.VeloraFormat.rupiah(
                                        goal.targetAmount
                                    )}
                                </span>
                            </div>

                            <strong
                                class="${
                                    reached
                                        ? "positive"
                                        : ""
                                }"
                            >
                                ${
                                    reached
                                        ? "Goal reached"
                                        : `${window.VeloraFormat.rupiah(
                                            remaining(
                                                goal
                                            )
                                        )} remaining`
                                }
                            </strong>
                        </div>

                        <div
                            class="goal-progress"
                            role="progressbar"
                            aria-valuenow="${percentage}"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-label="${escapeHtml(
                                goal.name
                            )} progress"
                        >
                            <span
                                style="width: ${progress(
                                    goal
                                )}%"
                            ></span>
                        </div>

                        <div class="goal-row-footer">
                            <span class="muted">
                                ${
                                    goal.targetDate
                                        ? `Target: ${dateLabel(
                                            goal.targetDate
                                        )}`
                                        : "No target date"
                                }

                                ${
                                    account
                                        ? ` · ${escapeHtml(
                                            account.name
                                        )}`
                                        : goal.accountId
                                            ? " · Account unavailable"
                                            : ""
                                }
                            </span>

                            <div class="goal-row-actions">
                                <button
                                    class="text-button"
                                    type="button"
                                    data-update-goal="${
                                        goal.id
                                    }"
                                >
                                    Update progress
                                </button>

                                <button
                                    class="text-button"
                                    type="button"
                                    data-edit-goal="${
                                        goal.id
                                    }"
                                >
                                    Edit
                                </button>

                                <button
                                    class="text-button danger-text"
                                    type="button"
                                    data-delete-goal="${
                                        goal.id
                                    }"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </article>
                `;
            })
            .join("");

        list.hidden =
            goals.length === 0;

        emptyState.hidden =
            goals.length !== 0;
    }

    async function refresh() {
        try {
            const [
                latestGoals,
                latestAccounts
            ] = await Promise.all([
                VeloraDB.getGoals(),
                VeloraDB.getAccounts()
            ]);

            goals = latestGoals;
            accounts = latestAccounts;

            render();

            return goals;
        } catch (error) {
            console.error(
                "[Velora] Goal refresh failed:",
                error
            );

            return [];
        }
    }

    async function load() {
        const result =
            await refresh();

        window.dispatchEvent(
            new CustomEvent(
                "velora:goals-updated",
                {
                    detail: result
                }
            )
        );

        return result;
    }

    function updateAccountOptions(
        selected = ""
    ) {
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

    function openSheet(
        goal = null,
        trigger = null,
        progressUpdate = false
    ) {
        editingId =
            progressUpdate
                ? goal.id
                : goal?.id ?? null;

        progressOnly =
            progressUpdate;

        returnFocus =
            trigger ??
            document.activeElement;

        form.reset();

        updateAccountOptions(
            goal?.accountId ?? ""
        );

        nameInput.value =
            goal?.name ?? "";

        targetInput.value =
            goal
                ? window.VeloraFormat.amount(
                    goal.targetAmount
                )
                : "";

        currentInput.value =
            goal
                ? window.VeloraFormat.amount(
                    goal.currentAmount
                )
                : "";

        targetDateInput.value =
            goal?.targetDate ?? "";

        form.elements.description.value =
            goal?.description ?? "";

        nameInput
            .closest(".form-field")
            .hidden =
            progressOnly;

        targetInput
            .closest(".form-field")
            .hidden =
            progressOnly;

        targetDateInput
            .closest(".form-field")
            .hidden =
            progressOnly;

        accountSelect
            .closest(".form-field")
            .hidden =
            progressOnly;

        document.querySelector(
            "#goal-sheet-eyebrow"
        ).textContent =
            progressOnly
                ? "UPDATE PROGRESS"
                : goal
                    ? "EDIT SAVINGS GOAL"
                    : "NEW SAVINGS GOAL";

        document.querySelector(
            "#goal-sheet-title"
        ).textContent =
            progressOnly
                ? "Update progress"
                : goal
                    ? "Edit savings goal"
                    : "New savings goal";

        document.querySelector(
            "#goal-submit-label"
        ).textContent =
            progressOnly
                ? "Save progress"
                : goal
                    ? "Save changes"
                    : "Create goal";

        setMessage();

        backdrop.hidden = false;
        sheet.hidden = false;

        document.body.classList.add(
            "modal-open"
        );

        requestAnimationFrame(
            () =>
                (
                    progressOnly
                        ? currentInput
                        : nameInput
                ).focus()
        );
    }

    function closeSheet() {
        sheet.hidden = true;
        backdrop.hidden = true;

        document.body.classList.remove(
            "modal-open"
        );

        nameInput
            .closest(".form-field")
            .hidden = false;

        targetInput
            .closest(".form-field")
            .hidden = false;

        targetDateInput
            .closest(".form-field")
            .hidden = false;

        accountSelect
            .closest(".form-field")
            .hidden = false;

        progressOnly = false;
        editingId = null;

        setMessage();

        returnFocus?.focus();
    }

    async function save(event) {
        event.preventDefault();

        const currentAmount =
            Number(
                String(
                    currentInput.value
                ).replace(/\./g, "")
            );

        const targetAmount =
            Number(
                String(
                    targetInput.value
                ).replace(/\./g, "")
            );

        const name =
            nameInput.value.trim();

        if (!progressOnly && !name) {
            setMessage(
                "Enter a goal name."
            );
            return;
        }

        if (
            !progressOnly &&
            (
                !Number.isFinite(
                    targetAmount
                ) ||
                targetAmount <= 0
            )
        ) {
            setMessage(
                "Enter a target amount greater than zero."
            );
            return;
        }

        if (
            !Number.isFinite(
                currentAmount
            ) ||
            currentAmount < 0
        ) {
            setMessage(
                "Enter a saved amount of zero or more."
            );
            return;
        }

        const existing =
            editingId
                ? await VeloraDB.getGoal(
                    editingId
                )
                : null;

        const goalTarget =
            progressOnly
                ? Number(
                    existing?.targetAmount
                ) || 0
                : targetAmount;

        if (currentAmount > goalTarget) {
            setMessage(
                "Saved amount cannot exceed the target."
            );
            return;
        }

        if (
            !progressOnly &&
            targetDateInput.value &&
            Number.isNaN(
                new Date(
                    `${targetDateInput.value}T00:00:00`
                ).getTime()
            )
        ) {
            setMessage(
                "Choose a valid target date."
            );
            return;
        }

        const now = Date.now();

        try {
            const data =
                editingId && progressOnly
                    ? {
                        ...existing,
                        currentAmount,
                        updatedAt: now
                    }
                    : editingId
                        ? {
                            ...existing,
                            name,
                            targetAmount,
                            currentAmount,
                            targetDate:
                                targetDateInput.value ||
                                "",
                            accountId:
                                accountSelect.value ||
                                "",
                            description:
                                String(
                                    form.elements
                                        .description
                                        .value ?? ""
                                ).trim(),
                            updatedAt: now
                        }
                        : {
                            id: makeId(),
                            name,
                            targetAmount,
                            currentAmount,
                            targetDate:
                                targetDateInput.value ||
                                "",
                            accountId:
                                accountSelect.value ||
                                "",
                            description:
                                String(
                                    form.elements
                                        .description
                                        .value ?? ""
                                ).trim(),
                            createdAt: now,
                            updatedAt: now
                        };

            if (editingId) {
                await VeloraDB.updateGoal(
                    data
                );
            } else {
                await VeloraDB.addGoal(
                    data
                );
            }

            closeSheet();

            await load();
        } catch (error) {
            console.error(
                "[Velora] Goal save failed:",
                error
            );

            setMessage(
                "This goal could not be saved. Please try again."
            );
        }
    }

    function openDelete(id) {
        deletingId = id;

        document.querySelector(
            "#goal-delete-dialog"
        ).hidden = false;

        document.querySelector(
            "#confirm-goal-delete"
        ).focus();
    }

    async function confirmDelete() {
        if (!deletingId) {
            return;
        }

        try {
            await VeloraDB.deleteGoal(
                deletingId
            );

            deletingId = null;

            document.querySelector(
                "#goal-delete-dialog"
            ).hidden = true;

            await load();
        } catch (error) {
            console.error(
                "[Velora] Goal deletion failed:",
                error
            );
        }
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
                "[data-open-goal]"
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
            .querySelector("#add-goal")
            .addEventListener(
                "click",
                (event) =>
                    openSheet(
                        null,
                        event.currentTarget
                    )
            );

        document
            .querySelector("#close-goal")
            .addEventListener(
                "click",
                closeSheet
            );

        document
            .querySelector("#cancel-goal")
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

        targetInput.addEventListener(
            "input",
            window.VeloraFormat.whileTyping
        );

        currentInput.addEventListener(
            "input",
            window.VeloraFormat.whileTyping
        );

        list.addEventListener(
            "click",
            (event) => {
                const updateButton =
                    event.target.closest(
                        "[data-update-goal]"
                    );

                const editButton =
                    event.target.closest(
                        "[data-edit-goal]"
                    );

                const deleteButton =
                    event.target.closest(
                        "[data-delete-goal]"
                    );

                if (updateButton) {
                    openSheet(
                        goals.find(
                            (goal) =>
                                goal.id ===
                                updateButton
                                    .dataset
                                    .updateGoal
                        ),
                        updateButton,
                        true
                    );

                    return;
                }

                if (editButton) {
                    openSheet(
                        goals.find(
                            (goal) =>
                                goal.id ===
                                editButton
                                    .dataset
                                    .editGoal
                        ),
                        editButton
                    );

                    return;
                }

                if (deleteButton) {
                    openDelete(
                        deleteButton
                            .dataset
                            .deleteGoal
                    );
                }
            }
        );

        document
            .querySelector(
                "#cancel-goal-delete"
            )
            .addEventListener(
                "click",
                () => {
                    deletingId = null;

                    document.querySelector(
                        "#goal-delete-dialog"
                    ).hidden = true;
                }
            );

        document
            .querySelector(
                "#confirm-goal-delete"
            )
            .addEventListener(
                "click",
                confirmDelete
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
                        "#goal-delete-dialog"
                    );

                if (
                    event.key === "Escape" &&
                    !deleteDialog.hidden
                ) {
                    document.querySelector(
                        "#cancel-goal-delete"
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
        progress,
        remaining,
        get goals() {
            return goals;
        }
    };

    window.VeloraGoals = api;
    api.ready = init();
})();