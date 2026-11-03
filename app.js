/* Lo propio de la app instalable, encima del tablero: botón para instalar, aviso sin conexión
   y recarga al volver después de un rato, para que siempre se vea lo último. */
(function () {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  var ua = navigator.userAgent || '';
  var IOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var ANDROID = /android/i.test(ua);
  var INSTALADA = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var CLAVE = 'tb-app-barra';

  function css() {
    if (document.getElementById('tb-app-css')) return;
    var s = document.createElement('style'); s.id = 'tb-app-css';
    s.textContent = '.tb-app{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:#0B2545;color:#fff;font:600 14px/1.4 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
      + '.tb-app span{flex:1;min-width:12rem}.tb-app b{color:#FBBF24}'
      + '.tb-app button{font:inherit;font-weight:800;border:0;border-radius:8px;padding:7px 14px;cursor:pointer;background:#F59E0B;color:#0B2545}'
      + '.tb-app button.x{background:none;color:#fff;font-size:20px;padding:2px 6px}'
      + '.tb-app.gris{background:#44546A}';
    document.head.appendChild(s);
  }
  function barra(html, boton, alPulsar, gris) {
    css();
    var d = document.createElement('div'); d.className = 'tb-app' + (gris ? ' gris' : ''); d.setAttribute('role', 'note');
    d.innerHTML = '<span>' + html + '</span>';
    if (boton) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = boton;
      b.addEventListener('click', function () { alPulsar(d); }); d.appendChild(b);
    }
    var x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.setAttribute('aria-label', 'Cerrar'); x.textContent = '×';
    x.addEventListener('click', function () { d.remove(); if (!gris) recordar(); }); d.appendChild(x);
    document.body.insertBefore(d, document.body.firstChild);
    return d;
  }
  function recordar() { try { localStorage.setItem(CLAVE, String(Date.now())); } catch (e) {} }
  function cerradaHacePoco() {
    try { var t = +localStorage.getItem(CLAVE); return t && Date.now() - t < 7 * 864e5; } catch (e) { return false; }
  }

  // Sin señal: la página es la última guardada.
  var g = window.__APP_GUARDADO__;
  if (g) {
    var f = new Date(g), txt = isNaN(f) ? 'la última vez que tuviste señal'
      : f.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    barra('Sin conexión: estás viendo los datos guardados el ' + txt + '. Se actualizan solos cuando vuelva la señal.', null, null, true);
  }

  // Instalar
  function ofrecer(e) {
    if (INSTALADA || cerradaHacePoco() || document.querySelector('.tb-app:not(.gris)')) return;
    barra('Instala la app <b>El Niño Piura</b>: queda en tu pantalla de inicio y se actualiza sola.', 'Instalar', function (d) {
      e.prompt();
      (e.userChoice || Promise.resolve({})).then(function (r) { if (r && r.outcome === 'accepted') d.remove(); else recordar(); });
      window.__bip = null;
    });
  }
  if (!INSTALADA) {
    if (window.__bip) ofrecer(window.__bip);
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__bip = e; ofrecer(e); });
    window.addEventListener('appinstalled', function () { var d = document.querySelector('.tb-app:not(.gris)'); if (d) d.remove(); });
    setTimeout(function () {
      if (window.__bip || cerradaHacePoco() || document.querySelector('.tb-app:not(.gris)')) return;
      if (IOS) barra('Para instalar la app en tu iPhone: toca <b>Compartir</b> (el cuadrado con la flecha) y luego <b>«Agregar a inicio»</b>.', null, null, false);
      else if (ANDROID) barra('Para instalar la app: abre el menú <b>⋮</b> del navegador y elige <b>«Instalar app»</b> o <b>«Agregar a la pantalla principal»</b>.', null, null, false);
    }, 4000);
  }

  // Al volver a la app después de 30 minutos, se recarga para traer lo último.
  var oculta = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { oculta = Date.now(); return; }
    if (oculta && Date.now() - oculta > 30 * 60000 && navigator.onLine !== false) location.reload();
  });
})();
