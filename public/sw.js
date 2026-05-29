const CACHE_VERSION = "v1";
const NAV_CACHE = `habit-nav-${CACHE_VERSION}`;
const STATIC_CACHE = `habit-static-${CACHE_VERSION}`;

// ─── Offline fallback (inline, no external dependency) ───────────────────────
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sin conexión — Habit Tracker</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
         display:flex;flex-direction:column;align-items:center;justify-content:center;
         min-height:100vh;gap:12px;text-align:center;padding:24px}
    h1{font-size:22px;font-weight:600}
    p{color:#8888AA;font-size:14px;line-height:1.6;max-width:280px}
  </style>
</head>
<body>
  <div style="font-size:52px;margin-bottom:4px">📵</div>
  <h1>Sin conexión</h1>
  <p>No hay conexión a internet.<br>Reconéctate para ver tus hábitos.</p>
</body>
</html>`;

// ─── Install: pre-cache offline page ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(NAV_CACHE).then((cache) =>
      cache.put(
        "/offline",
        new Response(OFFLINE_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
      )
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate: purge old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== NAV_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch strategies ─────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET from same origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Next.js immutable static chunks → Cache First
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((hit) => {
          if (hit) return hit;
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Navigation requests → Network First, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(NAV_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match("/offline"))
        )
    );
    return;
  }
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Habit Tracker 🔥", {
      body: data.body ?? "¿Ya completaste tus hábitos hoy?",
      icon: "/api/pwa/icon-192",
      badge: "/api/pwa/icon-192",
      data: { url: data.url ?? "/today" },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/today";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
