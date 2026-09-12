const CACHE_NAME = "velora-v8";

const APP_SHELL = [
    "./",
    "./index.html",

    "./manifest.json",
    "./assets/icons/192x192.png",
    "./assets/icons/512x512.png",
    "./assets/icons/512x512-maskable.png",

    "./css/style.css",
    "./css/theme.css",
    "./css/components.css",
    "./css/activity.css",
    "./css/insights.css",
    "./css/safe-to-spend.css",
    "./css/timeline.css",
    "./css/responsive.css",
    "./css/motion.css",
    "./css/polish.css",

    "./js/state.js",
    "./js/theme.js",
    "./js/navigation.js",
    "./js/db.js",
    "./js/categories.js",
    "./js/transactions.js",
    "./js/accounts.js",
    "./js/dashboard.js",
    "./js/budgets.js",
    "./js/recurring.js",
    "./js/goals.js",
    "./js/calendar.js",
    "./js/insights.js",
    "./js/safe-to-spend.js",
    "./js/activity.js",
    "./js/backup.js",
    "./js/csv.js",
    "./js/recovery.js",
    "./js/onboarding.js",
    "./js/app.js"
];

const NETWORK_FIRST_EXTENSIONS = new Set([
    ".html",
    ".css",
    ".js",
    ".json"
]);

function isSameOrigin(request) {
    return new URL(request.url).origin === self.location.origin;
}

function isNetworkFirstRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname.toLowerCase();

    if (request.mode === "navigate") {
        return true;
    }

    return [...NETWORK_FIRST_EXTENSIONS].some((extension) =>
        pathname.endsWith(extension)
    );
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);

        if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    const response = await fetch(request);

    if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
    }

    return response;
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
    );

    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET" || !isSameOrigin(request)) {
        return;
    }

    event.respondWith(
        isNetworkFirstRequest(request)
            ? networkFirst(request)
            : cacheFirst(request)
    );
});
