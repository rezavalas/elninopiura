/* Lo propio de la app instalable, encima del tablero: botón para instalar (con ayuda paso a paso
   según el teléfono y el navegador), aviso sin conexión y recarga al volver después de un rato.
   Se carga al principio de la página para no perder el aviso de Chrome de que la app se puede instalar. */
(function () {
  if (window.__tbApp) return; window.__tbApp = 1;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  var URL_APP = 'https://rezavalas.github.io/elninopiura/';
  var ua = navigator.userAgent || '';
  var IOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var ANDROID = /android/i.test(ua);
  var CHROME_IOS = /CriOS/i.test(ua), OTRO_IOS = /FxiOS|EdgiOS|OPiOS/i.test(ua);
  var SAMSUNG = /SamsungBrowser/i.test(ua);
  var INSTALADA = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var CLAVE = 'tb-app-barra';
  // Samsung Internet arma su propio instalador y Google Play Protect lo bloquea («se diseñó para una versión
  // anterior de Android»); desde Chrome la misma app se instala bien. En Samsung se lleva a la persona a Chrome.
  var bip = SAMSUNG ? null : (window.__bip || null);
  var CHROME_INTENT = 'intent://' + URL_APP.replace(/^https:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='
    + encodeURIComponent('https://play.google.com/store/apps/details?id=com.android.chrome') + ';end';

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); if (SAMSUNG) return; bip = window.__bip = e; listo(pintarBarra); });
  window.addEventListener('appinstalled', function () { INSTALADA = true; quitar('tb-app-inst'); cerrarHoja(); });

  function listo(f) { if (document.body) f(); else document.addEventListener('DOMContentLoaded', f); }
  function quitar(id) { var x = document.getElementById(id); if (x) x.remove(); }
  function recordar() { try { localStorage.setItem(CLAVE, String(Date.now())); } catch (e) {} }
  function cerradaHacePoco() { try { var t = +localStorage.getItem(CLAVE); return t && Date.now() - t < 3 * 864e5; } catch (e) { return false; } }

  function css() {
    if (document.getElementById('tb-app-css')) return;
    var s = document.createElement('style'); s.id = 'tb-app-css';
    s.textContent = [
      '.tb-app{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:#0B2545;color:#fff;font:600 14px/1.4 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
      '.tb-app span{flex:1;min-width:11rem}.tb-app b{color:#FBBF24}',
      '.tb-app button,.tb-hoja .tb-hb{font:inherit;font-weight:800;border:0;border-radius:9px;padding:8px 15px;cursor:pointer;background:#F59E0B;color:#0B2545;text-decoration:none;display:inline-flex;align-items:center;gap:6px}',
      '.tb-app button.x{background:none;color:#fff;font-size:22px;padding:0 6px;line-height:1}',
      '.tb-app.gris{background:#44546A}',
      '.tb-velo{position:fixed;inset:0;z-index:80;background:rgba(6,24,47,.55);display:flex;align-items:flex-end;justify-content:center}',
      '.tb-hoja{width:min(560px,100%);max-height:88vh;overflow:auto;background:#fff;color:#0E1C2F;border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));font:15px/1.45 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 -10px 30px rgba(0,0,0,.25)}',
      '@media (min-width:700px){.tb-velo{align-items:center}.tb-hoja{border-radius:18px}}',
      '.tb-hoja h3{margin:0 0 4px;font-size:1.12rem;color:#0B2545}.tb-hoja p{margin:0 0 12px;color:#44546A}',
      '.tb-hoja ol{margin:0;padding:0;list-style:none;counter-reset:p}',
      '.tb-hoja li{counter-increment:p;position:relative;padding:10px 0 10px 40px;border-top:1px solid #E1E6ED}',
      '.tb-hoja li::before{content:counter(p);position:absolute;left:0;top:10px;width:28px;height:28px;border-radius:50%;background:#0B2545;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:.9rem}',
      '.tb-hoja li b{color:#0B2545}.tb-hoja svg.ic{width:20px;height:20px;vertical-align:-4px;margin:0 2px;color:#1D4ED8}',
      '.tb-hoja .acc{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}',
      '.tb-hoja .tb-hb.sec{background:#EEF2F7;color:#0B2545}',
      '.tb-hoja .cerrar{float:right;border:0;background:none;font-size:26px;line-height:1;color:#8A99AD;cursor:pointer;padding:0 4px}',
      '.tb-hoja .ok{color:#15803D;font-weight:700;font-size:.85rem;margin-left:4px}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ---------- barras de arriba ---------- */
  function barra(id, html, boton, alPulsar, gris) {
    css(); quitar(id);
    var d = document.createElement('div'); d.id = id; d.className = 'tb-app' + (gris ? ' gris' : ''); d.setAttribute('role', 'note');
    d.innerHTML = '<span>' + html + '</span>';
    if (boton) { var b = document.createElement('button'); b.type = 'button'; b.textContent = boton; b.addEventListener('click', alPulsar); d.appendChild(b); }
    var x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.setAttribute('aria-label', 'Cerrar'); x.textContent = '×';
    x.addEventListener('click', function () { d.remove(); if (!gris) recordar(); }); d.appendChild(x);
    document.body.insertBefore(d, document.body.firstChild);
  }
  function abrirChrome() { location.href = CHROME_INTENT; }
  function pintarBarra() {
    if (INSTALADA || cerradaHacePoco()) return;
    if (SAMSUNG) {
      barra('tb-app-inst', 'Para instalar la app <b>El Niño Piura</b>, ábrela en <b>Chrome</b>: desde Samsung Internet, Google la bloquea.', 'Abrir en Chrome', abrirChrome);
      return;
    }
    barra('tb-app-inst', 'Instala la app <b>El Niño Piura</b> en tu ' + (IOS || ANDROID ? 'celular' : 'computadora') + ': queda con su ícono y se actualiza sola.', 'Instalar', instalar);
  }
  function instalar() {
    if (SAMSUNG) { hoja(); return; }
    if (bip) {
      var e = bip; bip = window.__bip = null;
      e.prompt();
      (e.userChoice || Promise.resolve({})).then(function (r) { if (r && r.outcome === 'accepted') quitar('tb-app-inst'); });
      return;
    }
    hoja();
  }

  /* ---------- ayuda paso a paso ---------- */
  var IC = {
    compartir: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
    menu: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    brujula: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor"/></svg>',
    mas: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    instalar: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 8v6M9 11.5l3 3 3-3M8 21h8"/></svg>'
  };
  function pasos() {
    if (IOS) {
      var L = [];
      if (CHROME_IOS) {
        L.push('Toca <b>Compartir</b> ' + IC.compartir + ' arriba a la derecha, junto a la barra de direcciones.');
        L.push('Elige <b>«Agregar a inicio»</b> ' + IC.mas + ' y luego <b>«Agregar»</b>.');
      } else {
        L.push('Debe estar abierta en <b>Safari</b>. Si la abriste desde WhatsApp u otra app, toca la <b>brújula</b> ' + IC.brujula + ' (abajo a la derecha) o <b>«Abrir en Safari»</b>. Si no aparece, copia el enlace con el botón de abajo y pégalo en Safari.');
        L.push('En Safari, toca <b>Compartir</b> ' + IC.compartir + ': el cuadrado con la flecha, abajo en el centro (en iPad, arriba a la derecha).');
        L.push('Desliza la lista hacia arriba y toca <b>«Agregar a inicio»</b> ' + IC.mas + '; luego <b>«Agregar»</b>.');
      }
      L.push('Listo: busca el ícono de <b>El Niño Piura</b> (la gotita) en tu pantalla de inicio.');
      return { t: 'Instalar en iPhone o iPad', p: L };
    }
    if (SAMSUNG) {
      return { t: 'Instalar desde un Samsung', p: [
        'En el navegador <b>Samsung Internet</b>, Google Play Protect bloquea la instalación con el aviso «se diseñó para una versión anterior de Android». Le pasa a muchas apps web: es por cómo arma la app ese navegador, no por el tablero. Si ya tocaste «Entendido», no se instaló nada.',
        'Toca <b>«Abrir en Chrome»</b> aquí abajo. El tablero se abre en Chrome, que ya viene en tu celular.',
        'En Chrome, toca <b>Instalar</b> en la barra de arriba, o el menú ' + IC.menu + ' → <b>«Instalar app»</b>. Desde Chrome Google no la bloquea.',
        'Listo: busca el ícono de <b>El Niño Piura</b> (la gotita) en tu pantalla de inicio. Si prefieres no instalar, puedes seguir usando el tablero aquí mismo.'
      ] };
    }
    if (ANDROID) {
      return { t: 'Instalar en Android', p: [
        'Debe estar abierta en <b>Chrome</b>. Si la abriste desde WhatsApp, Facebook u otra app, toca <b>«Abrir en Chrome»</b> aquí abajo, o el menú ' + IC.menu + ' de arriba a la derecha y <b>«Abrir en Chrome»</b>.',
        'En Chrome, toca el menú ' + IC.menu + ' (arriba a la derecha) y elige <b>«Instalar app»</b>. Si no aparece, elige <b>«Agregar a la pantalla principal»</b> y luego <b>«Instalar»</b>.',
        'Listo: busca el ícono de <b>El Niño Piura</b> (la gotita) en tu pantalla de inicio o entre tus aplicaciones.'
      ] };
    }
    return { t: 'Instalar en la computadora', p: [
      'Usa <b>Chrome</b> o <b>Edge</b>.',
      'Haz clic en el ícono de instalar ' + IC.instalar + ' al final de la barra de direcciones, o en el menú ' + IC.menu + ' → <b>«Transmitir, guardar y compartir»</b> → <b>«Instalar página como app»</b>.',
      'La app queda en tu escritorio y en el menú de inicio.'
    ] };
  }
  function cerrarHoja() { quitar('tb-app-hoja'); }
  function hoja() {
    css(); cerrarHoja();
    var P = pasos(), v = document.createElement('div'); v.className = 'tb-velo'; v.id = 'tb-app-hoja';
    v.innerHTML = '<div class="tb-hoja" role="dialog" aria-modal="true" aria-labelledby="tb-hoja-t"><button type="button" class="cerrar" aria-label="Cerrar">×</button>'
      + '<h3 id="tb-hoja-t">' + P.t + '</h3><p>Tarda menos de un minuto y no ocupa casi espacio.</p><ol>'
      + P.p.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol><div class="acc"></div></div>';
    var acc = v.querySelector('.acc');
    if (ANDROID) {
      var a = document.createElement('a'); a.className = 'tb-hb';
      a.href = CHROME_INTENT;
      a.textContent = 'Abrir en Chrome'; a.target = '_top'; acc.appendChild(a);
    }
    var c = document.createElement('button'); c.type = 'button'; c.className = 'tb-hb sec'; c.textContent = 'Copiar el enlace';
    c.addEventListener('click', function () {
      var fin = function () { c.textContent = 'Enlace copiado'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(URL_APP).then(fin, function () { prompt('Copia este enlace:', URL_APP); });
      else prompt('Copia este enlace:', URL_APP);
    });
    acc.appendChild(c);
    v.addEventListener('click', function (ev) { if (ev.target === v || ev.target.classList.contains('cerrar')) cerrarHoja(); });
    document.body.appendChild(v);
  }

  /* ---------- al cargar la página ---------- */
  listo(function () {
    var g = window.__APP_GUARDADO__;
    if (g) {
      var f = new Date(g), txt = isNaN(f) ? 'la última vez que tuviste señal'
        : f.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
      barra('tb-app-sin', 'Sin conexión: estás viendo los datos guardados el ' + txt + '. Se actualizan solos cuando vuelva la señal.', null, null, true);
    }
    if (!INSTALADA) {
      pintarBarra();
      // enlace fijo al pie, por si alguien cerró la barra
      var pie = document.querySelector('.tb-footer');
      if (pie && !document.getElementById('tb-app-pie')) {
        var p = document.createElement('p'); p.id = 'tb-app-pie';
        var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Instalar la app en este equipo';
        b.style.cssText = 'font:inherit;font-weight:700;border:1px solid #BFD4F2;background:#EFF6FF;color:#1D4ED8;border-radius:8px;padding:6px 12px;cursor:pointer';
        b.addEventListener('click', instalar); p.appendChild(b); pie.insertBefore(p, pie.firstChild);
      }
    }
  });
  window.__tbInstalar = instalar; window.__tbAppCss = css; window.__tbAppBarra = barra;

  // Al volver a la app después de 30 minutos, se recarga para traer lo último.
  var oculta = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { oculta = Date.now(); return; }
    if (oculta && Date.now() - oculta > 30 * 60000 && navigator.onLine !== false) location.reload();
  });
})();
