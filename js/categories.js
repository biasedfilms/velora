const VeloraCategories = (() => {
    const DEFAULTS = ["Food", "Shopping", "Transport", "Bills", "Health", "Other"];
    const list = document.querySelector("#category-list");
    const panel = document.querySelector("#categories-panel");
    const sheet = document.querySelector("#category-sheet");
    const backdrop = document.querySelector("#category-backdrop");
    const form = document.querySelector("#category-form");
    const nameInput = document.querySelector("#category-name");
    const iconInput = document.querySelector("#category-icon");
    const message = document.querySelector("#category-form-message");
    let categories = [];
    let editingId = null;
    let deletingId = null;
    let returnFocus = null;

    function makeId() {
        return window.crypto?.randomUUID?.() ?? `category-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function setMessage(text = "") {
        message.textContent = text;
        message.hidden = !text;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character]));
    }

    async function seedDefaults() {
        if (await VeloraDB.getSetting("categories-initialized")) return;
        const existing = await VeloraDB.getCategories();
        const names = new Set(existing.map((category) => category.name.toLowerCase()));
        const now = Date.now();
        await Promise.all(DEFAULTS.filter((name) => !names.has(name.toLowerCase())).map((name) => VeloraDB.addCategory({ id: `default-${name.toLowerCase()}`, name, icon: "", createdAt: now, updatedAt: now })));
        await VeloraDB.setSetting("categories-initialized", true);
    }

    async function load() {
        categories = await VeloraDB.getCategories();
        render();
        window.dispatchEvent(new CustomEvent("velora:categories-updated", { detail: categories }));
        return categories;
    }

    function render() {
        list.innerHTML = categories.map((category) => `<article class="category-row"><span class="category-mark" aria-hidden="true">${escapeHtml(category.icon || category.name.charAt(0).toUpperCase())}</span><strong>${escapeHtml(category.name)}</strong><div class="category-row-actions"><button class="text-button" type="button" data-edit-category="${category.id}">Edit</button><button class="text-button danger-text" type="button" data-delete-category="${category.id}">Delete</button></div></article>`).join("");
    }

    function openSheet(category = null, trigger = null) {
        editingId = category?.id ?? null;
        returnFocus = trigger ?? document.activeElement;
        form.reset();
        nameInput.value = category?.name ?? "";
        iconInput.value = category?.icon ?? "";
        document.querySelector("#category-sheet-eyebrow").textContent = category ? "EDIT CATEGORY" : "NEW CATEGORY";
        document.querySelector("#category-sheet-title").textContent = category ? "Edit category" : "New category";
        document.querySelector("#category-submit-label").textContent = category ? "Save changes" : "Create category";
        setMessage();
        backdrop.hidden = false;
        sheet.hidden = false;
        document.body.classList.add("modal-open");
        requestAnimationFrame(() => nameInput.focus());
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
        const duplicate = categories.some((category) => category.name.toLowerCase() === name.toLowerCase() && category.id !== editingId);
        if (!name) return setMessage("Enter a category name.");
        if (duplicate) return setMessage("That category already exists.");
        const now = Date.now();
        try {
            if (editingId) {
                const existing = await VeloraDB.getCategory(editingId);
                await VeloraDB.updateCategory({ ...existing, name, icon: iconInput.value.trim(), updatedAt: now });
                if (existing.name !== name) await VeloraDB.renameTransactionCategory(existing.name, name);
            } else {
                await VeloraDB.addCategory({ id: makeId(), name, icon: iconInput.value.trim(), createdAt: now, updatedAt: now });
            }
            closeSheet();
            await load();
            await window.VeloraTransactions?.render();
        } catch (error) {
            console.error("[Velora] Category save failed:", error);
            setMessage("This category could not be saved. Please try again.");
        }
    }

    async function openDelete(id) {
        const category = categories.find((item) => item.id === id);
        if (!category) return;
        const transactions = await VeloraDB.getTransactions();
        const used = transactions.some((transaction) => transaction.category === category.name);
        const budgets = await VeloraDB.getBudgets();
        const budgetUsed = budgets.some((budget) => budget.categoryId === category.id);
        const recurring = await VeloraDB.getRecurringExpenses();
        const recurringUsed = recurring.some((expense) => expense.categoryId === category.id);
        const goals = await VeloraDB.getGoals();
        const goalUsed = goals.some((goal) => goal.categoryId === category.id);
        deletingId = used ? null : id;
        deletingId = used || budgetUsed || recurringUsed || goalUsed ? null : id;
        document.querySelector("#category-delete-title").textContent = used || budgetUsed || recurringUsed || goalUsed ? "Category is in use" : "Delete category?";
        document.querySelector("#category-delete-message").textContent = used ? `“${category.name}” is used by existing transactions and cannot be deleted.` : budgetUsed ? `“${category.name}” is used by existing budgets and cannot be deleted.` : recurringUsed ? `“${category.name}” is used by recurring expenses and cannot be deleted.` : goalUsed ? `“${category.name}” is used by savings goals and cannot be deleted.` : `Delete “${category.name}” from this device?`;
        document.querySelector("#confirm-category-delete").hidden = used || budgetUsed || recurringUsed || goalUsed;
        document.querySelector("#category-delete-dialog").hidden = false;
        document.querySelector(used || budgetUsed || recurringUsed || goalUsed ? "#cancel-category-delete" : "#confirm-category-delete").focus();
    }

    async function confirmDelete() {
        if (!deletingId) return;
        await VeloraDB.deleteCategory(deletingId);
        deletingId = null;
        document.querySelector("#category-delete-dialog").hidden = true;
        await load();
    }

    function bind() {
        document.querySelector("#add-category").addEventListener("click", (event) => openSheet(null, event.currentTarget));
        document.querySelector("#close-category").addEventListener("click", closeSheet);
        document.querySelector("#cancel-category").addEventListener("click", closeSheet);
        backdrop.addEventListener("click", closeSheet);
        form.addEventListener("submit", save);
        list.addEventListener("click", (event) => {
            const editButton = event.target.closest("[data-edit-category]");
            const deleteButton = event.target.closest("[data-delete-category]");
            if (editButton) openSheet(categories.find((category) => category.id === editButton.dataset.editCategory), editButton);
            if (deleteButton) openDelete(deleteButton.dataset.deleteCategory);
        });
        document.querySelector("#cancel-category-delete").addEventListener("click", () => { deletingId = null; document.querySelector("#category-delete-dialog").hidden = true; });
        document.querySelector("#confirm-category-delete").addEventListener("click", confirmDelete);
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !sheet.hidden) closeSheet();
            if (event.key === "Escape" && !document.querySelector("#category-delete-dialog").hidden) document.querySelector("#cancel-category-delete").click();
        });
    }

    function setVisible(visible) { panel.hidden = !visible; }

    async function init() {
        bind();
        await seedDefaults();
        await load();
    }

    const api = { init, load, get categories() { return categories; }, setVisible };
    window.VeloraCategories = api;
    api.ready = init();
    return api;
})();
