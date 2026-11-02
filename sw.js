/* ============================================================
   MONO — SERVICE WORKER (Этап 22, PWA)
   Стратегия network-first с фолбэком в кэш: онлайн всегда свежая
   версия (важно для частых деплоев), офлайн — оболочка из кэша.
   Кэш версионируется; при активации старые удаляются.
   ============================================================ */
const CACHE = "mono-shell-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./src/css/tokens.css",
  "./src/css/layout-base.css",
  "./src/css/components.css",
  "./src/js/core.js",
  "./src/js/store.js",
  "./src/data/mock.js",
  "./src/js/views/home.js",
  "./src/js/views/teacher.js",
  "./src/js/views/budget.js",
  "./src/js/views/finance.js",
  "./src/js/views/profile.js",
  "./src/js/app.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
