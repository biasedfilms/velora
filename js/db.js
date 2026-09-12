// IndexedDB backbone.
// Financial data belongs here, not in localStorage.

const VeloraDB = (() => {
    const DB_NAME = "velora";
    const DB_VERSION = 1;

    const stores = [
        "transactions",
        "accounts",
        "categories",
        "budgets",
        "recurringExpenses",
        "goals",
        "settings"
    ];

    function open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;

                for (const store of stores) {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: "id" });
                    }
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function withStore(storeName, mode, callback) {
        return open().then((db) => new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, mode);
            const request = callback(transaction.objectStore(storeName));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        }));
    }

    function addTransaction(transaction) {
        return withStore("transactions", "readwrite", (store) => store.add(transaction));
    }

    function getTransactions() {
        return withStore("transactions", "readonly", (store) => store.getAll()).then((transactions) =>
            transactions.sort((first, second) => new Date(second.date) - new Date(first.date) || second.createdAt - first.createdAt)
        );
    }

    function getTransaction(id) {
        return withStore("transactions", "readonly", (store) => store.get(id));
    }

    function updateTransaction(transaction) {
        return withStore("transactions", "readwrite", (store) => store.put(transaction));
    }

    function deleteTransaction(id) {
        return withStore("transactions", "readwrite", (store) => store.delete(id));
    }

    function addCategory(category) { return withStore("categories", "readwrite", (store) => store.add(category)); }
    function getCategories() { return withStore("categories", "readonly", (store) => store.getAll()).then((categories) => categories.sort((first, second) => first.name.localeCompare(second.name))); }
    function getCategory(id) { return withStore("categories", "readonly", (store) => store.get(id)); }
    function updateCategory(category) { return withStore("categories", "readwrite", (store) => store.put(category)); }
    function deleteCategory(id) { return withStore("categories", "readwrite", (store) => store.delete(id)); }

    function addAccount(account) { return withStore("accounts", "readwrite", (store) => store.add(account)); }
    function getAccounts() { return withStore("accounts", "readonly", (store) => store.getAll()).then((accounts) => accounts.sort((first, second) => first.name.localeCompare(second.name))); }
    function getAccount(id) { return withStore("accounts", "readonly", (store) => store.get(id)); }
    function updateAccount(account) { return withStore("accounts", "readwrite", (store) => store.put(account)); }
    function deleteAccount(id) { return withStore("accounts", "readwrite", (store) => store.delete(id)); }

    function addBudget(budget) { return withStore("budgets", "readwrite", (store) => store.add(budget)); }
    function getBudgets() { return withStore("budgets", "readonly", (store) => store.getAll()); }
    function getBudget(id) { return withStore("budgets", "readonly", (store) => store.get(id)); }
    function updateBudget(budget) { return withStore("budgets", "readwrite", (store) => store.put(budget)); }
    function deleteBudget(id) { return withStore("budgets", "readwrite", (store) => store.delete(id)); }

    function addRecurringExpense(expense) { return withStore("recurringExpenses", "readwrite", (store) => store.add(expense)); }
    function getRecurringExpenses() { return withStore("recurringExpenses", "readonly", (store) => store.getAll()); }
    function getRecurringExpense(id) { return withStore("recurringExpenses", "readonly", (store) => store.get(id)); }
    function updateRecurringExpense(expense) { return withStore("recurringExpenses", "readwrite", (store) => store.put(expense)); }
    function deleteRecurringExpense(id) { return withStore("recurringExpenses", "readwrite", (store) => store.delete(id)); }

    function addGoal(goal) { return withStore("goals", "readwrite", (store) => store.add(goal)); }
    function getGoals() { return withStore("goals", "readonly", (store) => store.getAll()); }
    function getGoal(id) { return withStore("goals", "readonly", (store) => store.get(id)); }
    function updateGoal(goal) { return withStore("goals", "readwrite", (store) => store.put(goal)); }
    function deleteGoal(id) { return withStore("goals", "readwrite", (store) => store.delete(id)); }

    function getSetting(id) { return withStore("settings", "readonly", (store) => store.get(id)); }
    function setSetting(id, value) { return withStore("settings", "readwrite", (store) => store.put({ id, value })); }

    const BACKUP_FORMAT = "velora-backup";
    const BACKUP_VERSION = 1;

    async function exportBackup() {
        const data = {};

        for (const store of stores) {
            data[store] = await withStore(store, "readonly", (objectStore) => objectStore.getAll());
        }

        return {
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            app: "Velora",
            exportedAt: new Date().toISOString(),
            stores: data
        };
    }

    function validateBackup(backup) {
        if (!backup || typeof backup !== "object") {
            throw new Error("The selected file is not a valid Velora backup.");
        }

        if (backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
            throw new Error("This backup was created by an unsupported Velora version.");
        }

        if (!backup.stores || typeof backup.stores !== "object") {
            throw new Error("The backup is missing its data stores.");
        }

        for (const store of stores) {
            if (!Array.isArray(backup.stores[store])) {
                throw new Error(`The backup is missing the ${store} store.`);
            }

            const seenIds = new Set();
            for (const record of backup.stores[store]) {
                if (!record || typeof record !== "object" || Array.isArray(record) || record.id === undefined || record.id === null) {
                    throw new Error(`The ${store} store contains an invalid record.`);
                }
                const id = String(record.id);
                if (seenIds.has(id)) {
                    throw new Error(`The ${store} store contains duplicate records.`);
                }
                seenIds.add(id);
            }
        }

        if (backup.exportedAt && Number.isNaN(Date.parse(backup.exportedAt))) {
            throw new Error("The backup timestamp is invalid.");
        }

        return true;
    }

    async function clearAllData() {
        const db = await open();

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(stores, "readwrite");
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error("Velora could not delete local data."));
            transaction.onabort = () => reject(transaction.error || new Error("Velora could not delete local data."));

            for (const storeName of stores) {
                transaction.objectStore(storeName).clear();
            }
        });
    }

    async function importBackup(backup) {
        validateBackup(backup);

        const db = await open();

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(stores, "readwrite");

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error("Velora could not restore the backup."));
            transaction.onabort = () => reject(transaction.error || new Error("Velora could not restore the backup."));

            for (const storeName of stores) {
                const objectStore = transaction.objectStore(storeName);
                objectStore.clear();

                for (const record of backup.stores[storeName]) {
                    objectStore.add(record);
                }
            }
        });
    }

    async function renameTransactionCategory(previousName, nextName) {
        const transactions = await getTransactions();
        await Promise.all(transactions.filter((transaction) => transaction.category === previousName).map((transaction) => updateTransaction({ ...transaction, category: nextName, updatedAt: Date.now() })));
    }

    async function renameTransactionAccount(previousName, nextName) {
        const transactions = await getTransactions();
        await Promise.all(transactions.filter((transaction) => transaction.account === previousName).map((transaction) => updateTransaction({ ...transaction, account: nextName, updatedAt: Date.now() })));
    }

    return { open, addTransaction, getTransactions, getTransaction, updateTransaction, deleteTransaction, addCategory, getCategories, getCategory, updateCategory, deleteCategory, addAccount, getAccounts, getAccount, updateAccount, deleteAccount, addBudget, getBudgets, getBudget, updateBudget, deleteBudget, clearAllData, addRecurringExpense, getRecurringExpenses, getRecurringExpense, updateRecurringExpense, deleteRecurringExpense, addGoal, getGoals, getGoal, updateGoal, deleteGoal, getSetting, setSetting, exportBackup, validateBackup, importBackup, renameTransactionCategory, renameTransactionAccount };
})();

window.VeloraDB = VeloraDB;
