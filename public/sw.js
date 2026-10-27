// No CacheStorage, IndexedDB or persisted responses: gym records stay online-only.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* Always show a safe notification. */
  }
  event.waitUntil(
    self.registration.showNotification("Shelby Gym", {
      body:
        data && typeof data.body === "string"
          ? data.body.slice(0, 180)
          : "Tenés avisos para revisar en el gimnasio.",
      icon: "/brand/app-192.png",
      badge: "/brand/app-192.png",
      tag: "shelby-owner-alerts",
      data: { url: "/avisos" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL("/avisos", self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const client = windows.find(
          (w) => new URL(w.url).origin === self.location.origin,
        );
        if (client) {
          await client.navigate(target);
          return client.focus();
        }
        return self.clients.openWindow(target);
      }),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate")
    return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sin conexión · Shelby Gym</title><style>body{margin:0;background:#0b0b0d;color:#f4f4f5;font:17px system-ui;min-height:100svh;display:grid;place-items:center}main{max-width:28rem;padding:32px}p{line-height:1.6;color:#c4c4cc}a{display:inline-block;padding:14px 20px;background:#b8202b;color:white;border-radius:12px;text-decoration:none}a:focus-visible{outline:3px solid white;outline-offset:4px}</style><main><p>SHELBY GYM</p><h1>No hay conexión.</h1><p>Conectate a internet para consultar clientes y registrar pagos. Esta pantalla no guarda ni confirma operaciones.</p><a href="/clientes">Volver a intentar</a></main></html>',
          {
            status: 503,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              "Content-Security-Policy":
                "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
            },
          },
        ),
    ),
  );
});
