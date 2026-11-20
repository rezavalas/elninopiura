/* App del Tablero El Niño Piura: guarda lo necesario para abrir sin señal.
   La app misma se pide primero a la red, así cada cambio llega solo; la página del día la guarda index.html. */
var VERSION = 'elninopiura-10';
var BASE = ['./', './index.html', './app.js', './alertas.js', './config.js', './shell.js', './shell.css', './leaflet.js', './leaflet.css', './distritos.json', './sirena.mp3', './d3.min.js', './manifest.webmanifest', './icono-192.png', './icono-512.png', './icono-maskable-512.png', './icono-180.png', './favicon-32.png'];

// Avisos de lluvia de Gotita (Firebase Cloud Messaging): llegan aunque la app esté cerrada.
// El aviso vibra en pulsos largos, como sirena; la sirena suena al abrirlo (o en la app si está abierta).
// Con la app cerrada suena el tono de notificaciones del celular (la web no puede cambiarlo).
var VIBRA_SIRENA = [800, 200, 800, 200, 800, 200, 800];
importScripts('config.js');
var FB = self.TB_FIREBASE && self.TB_FIREBASE.apiKey ? self.TB_FIREBASE : null;
if (FB) try {   // si la librería no carga (sin señal), la app igual funciona; los avisos se activan en la próxima visita
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
  firebase.initializeApp(FB);
  firebase.messaging().onBackgroundMessage(function (p) {
    var d = (p && p.data) || {};
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {   // si la app está abierta detrás, que suene la sirena
      cs.forEach(function (c) { c.postMessage({ tipo: 'sirena' }); });
    });
    return self.registration.showNotification(d.titulo || 'Gotita', {
      body: d.texto || '', icon: 'icono-192.png', badge: 'icono-192.png', tag: 'lluvia-' + (d.ubigeo || ''), renotify: true,
      requireInteraction: true, silent: false, vibrate: VIBRA_SIRENA, data: { url: d.url || './', sirena: 1 },
      actions: [{ action: 'ver', title: 'Ver en la app' }]
    });
  });
} catch (e) {}
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var dt = e.notification.data || {}, url = dt.url || './';
  if (dt.sirena) url += (url.indexOf('?') < 0 ? '?' : '&') + 'sirena=1';   // la app hace sonar la sirena al abrirse
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) if (cs[i].url.indexOf(self.registration.scope) === 0 && 'focus' in cs[i]) {
      if (dt.sirena) cs[i].postMessage({ tipo: 'sirena' });
      return cs[i].focus();
    }
    return clients.openWindow(url);
  }));
});

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
    // no-cache: pregunta a GitHub si hay versión nueva (respuesta corta si no cambió), así la app nueva llega al instante
    e.respondWith(fetch(r.mode === 'navigate' ? r.url : r, { cache: 'no-cache' }).then(function (resp) {
      if (resp.ok) { var copia = resp.clone(); caches.open(VERSION).then(function (c) { c.put(r, copia); }); }
      return resp;
    }).catch(function () {
      return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || caches.match('./index.html'); });
    }));
    return;
  }
  // d3 y las letras: se guardan la primera vez para que el tablero se vea igual sin señal
  if (/^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com)$/.test(u.hostname)) {
    e.respondWith(caches.open('externos').then(function (c) {
      return c.match(r).then(function (m) {
        return m || fetch(r).then(function (resp) { if (resp.ok || resp.type === 'opaque') c.put(r, resp.clone()); return resp; });
      });
    }));
  }
});
