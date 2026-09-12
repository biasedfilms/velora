(() => {
    const isLocalDevelopment = [
        "localhost",
        "127.0.0.1",
        "::1"
    ].includes(window.location.hostname);

    async function initDatabase() {
        try {
            await VeloraDB.open();
            console.info("[Velora] IndexedDB ready.");
        } catch (error) {
            console.error(
                "[Velora] IndexedDB failed to initialize:",
                error
            );
        }
    }

    async function disableServiceWorkerForDevelopment() {
        if (!isLocalDevelopment || !("serviceWorker" in navigator)) {
            return;
        }

        try {
            const registrations = await navigator.serviceWorker.getRegistrations();

            await Promise.all(
                registrations.map((registration) => registration.unregister())
            );

            const cacheKeys = await caches.keys();

            await Promise.all(
                cacheKeys
                    .filter((key) => key.startsWith("velora-"))
                    .map((key) => caches.delete(key))
            );

            console.info("[Velora] Development mode: service-worker caches disabled.");
        } catch (error) {
            console.warn(
                "[Velora] Could not clear development service-worker state:",
                error
            );
        }
    }

    function showUpdateNotice(worker) {
        const banner = document.querySelector("#update-available");
        const reloadButton = document.querySelector("#reload-for-update");
        if (!banner || !reloadButton) return;
        banner.hidden = false;
        reloadButton.onclick = () => {
            reloadButton.disabled = true;
            let reloaded = false;
            const reload = () => {
                if (reloaded) return;
                reloaded = true;
                window.location.reload();
            };
            navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
            worker.postMessage({ type: "SKIP_WAITING" });
            window.setTimeout(reload, 2500);
        };
    }

    async function registerServiceWorker() {
        // Never register a service worker on Live Server / localhost.
        // Development should always read the current files directly.
        if (
            isLocalDevelopment ||
            !window.isSecureContext ||
            !("serviceWorker" in navigator)
        ) {
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register("./sw.js");

            if (registration.waiting && navigator.serviceWorker.controller) {
                showUpdateNotice(registration.waiting);
            }

            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        showUpdateNotice(newWorker);
                    }
                });
            });

            console.info("[Velora] Service worker registered.");
        } catch (error) {
            console.error("[Velora] Service worker registration failed:", error);
        }
    }

    async function init() {
        await disableServiceWorkerForDevelopment();
        await initDatabase();
        await registerServiceWorker();
    }

    init();
})();
