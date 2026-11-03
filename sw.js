/* App del Tablero El Niño Piura: guarda lo necesario para abrir sin señal.
   La app misma se pide primero a la red, así cada cambio llega solo; la página del día la guarda index.html. */
var VERSION = 'elninopiura-3';
var BASE = ['./', './index.html', './app.js', './manifest.webmanifest', './icono-192.png', './icono-512.png', './icono-maskable-512.png', './icono-180.png', './favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION && k !== 'tablero-contenido' && k !== 'externos'; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.origin === self.location.origin) {
    e.respondWith(fetch(r).then(function (resp) {
      if (resp.ok) { var copia = resp.clone(); caches.open(VERSION).then(function (c) { c.put(r, copia); }); }
      return resp;
    }).catch(function () {
      return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || caches.match('./index.html'); });
    }));
    return;
  }
  // d3 y las letras: se guardan la primera vez para que el tablero se vea igual sin señal
  if (/^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)) {
    e.respondWith(caches.open('externos').then(function (c) {
      return c.match(r).then(function (m) {
        return m || fetch(r).then(function (resp) { if (resp.ok || resp.type === 'opaque') c.put(r, resp.clone()); return resp; });
      });
    }));
  }
});
