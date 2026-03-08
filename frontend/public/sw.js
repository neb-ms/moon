const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `project-lunar-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `project-lunar-static-${CACHE_VERSION}`;
const API_CACHE = `project-lunar-api-${CACHE_VERSION}`;

const APP_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/moon-192.svg",
  "/icons/moon-512.svg",
  "/icons/moon-maskable-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const expectedCaches = new Set([APP_SHELL_CACHE, STATIC_CACHE, API_CACHE]);
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map((cacheName) => {
          if (!expectedCaches.has(cacheName)) {
            return caches.delete(cacheName);
          }

          return Promise.resolve(false);
        }),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (requestUrl.pathname.startsWith("/api/v1/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (isStaticAssetRequest(requestUrl.pathname)) {
    event.respondWith(handleStaticAssetRequest(request));
  }
});

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(APP_SHELL_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cache = await caches.open(APP_SHELL_CACHE);
    const cachedRoute = await cache.match(request);
    if (cachedRoute) {
      return cachedRoute;
    }

    const cachedIndex = await cache.match("/index.html");
    if (cachedIndex) {
      return cachedIndex;
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    networkPromise.catch(() => null);
    return cachedResponse;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response(
    JSON.stringify({
      error: {
        code: "OFFLINE_UNAVAILABLE",
        message: "No cached API data is available while offline.",
      },
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    },
  );
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

function isStaticAssetRequest(pathname) {
  return /\.(?:js|css|svg|png|jpg|jpeg|webp|avif|woff2?)$/i.test(pathname);
}
