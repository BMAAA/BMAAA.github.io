const CACHE_NAME = "bmaaa-v35";
const YEAR = 31536000;
const HOUR = 3600;
const BASE = new URL("./", self.location.href).pathname.replace(/\/$/, "") || "";
const PRECACHE_PATHS = [
  "/",
  "/index.html",
  "/about.html",
  "/leather-color.html",
  "/styles/style.css",
  "/styles/style-leather.css",
  "/scripts/base.js",
  "/scripts/i18n.js",
  "/scripts/layout.js",
  "/scripts/placeholders.js",
  "/scripts/daily_jokes.js",
  "/scripts/indexes.js",
  "/scripts/script_registry.js",
  "/scripts/script_leather.js",
  "/scripts/leather_worker.js",
  "/data/daily_jokes.json",
  "/data/item_aliases.json",
  "/data/badsell_filter.json",
  "/favicon.ico",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
const PRECACHE = PRECACHE_PATHS.map((path) => BASE + path);

function stripBase(pathname) {
  if (!BASE) return pathname;
  if (pathname === BASE) return "/";
  if (pathname.startsWith(BASE + "/")) return pathname.slice(BASE.length) || "/";
  return pathname;
}

function withCacheControl(response, maxAge, immutable) {
  if (!response || !response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set(
    "Cache-Control",
    immutable
      ? `public, max-age=${maxAge}, immutable`
      : `public, max-age=${maxAge}`,
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isImmutableAsset(pathname) {
  const path = stripBase(pathname);
  return (
    path.startsWith("/assets/") ||
    path.startsWith("/icons/") ||
    path.startsWith("/styles/") ||
    path.startsWith("/scripts/") ||
    path === "/favicon.ico" ||
    path === "/manifest.json"
  );
}

function isHtml(pathname) {
  const path = stripBase(pathname);
  return (
    path === "/" ||
    path.endsWith(".html") ||
    path === "/leather-color" ||
    path === "/about"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;
  const relative = stripBase(pathname);
  const isData = relative.startsWith("/data/") || relative.startsWith("/loc/");

  if (isData) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cached = withCacheControl(response.clone(), HOUR, false);
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cached.clone()));
          return withCacheControl(response, HOUR, false);
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ? withCacheControl(cached.clone(), HOUR, false) : cached;
        }),
    );
    return;
  }

  if (isHtml(pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cached = withCacheControl(response.clone(), HOUR, false);
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cached.clone()));
          return withCacheControl(response, HOUR, false);
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ? withCacheControl(cached.clone(), HOUR, false) : cached;
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return withCacheControl(cached.clone(), YEAR, isImmutableAsset(pathname));
      }
      return fetch(request).then((response) => {
        const toStore = withCacheControl(
          response.clone(),
          YEAR,
          isImmutableAsset(pathname),
        );
        caches.open(CACHE_NAME).then((cache) => cache.put(request, toStore.clone()));
        return withCacheControl(response, YEAR, isImmutableAsset(pathname));
      });
    }),
  );
});
