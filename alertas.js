/* Alertas de lluvia de Gotita. Cada persona elige su distrito; si el pronóstico da lluvia allí, o si la
   lluvia viene con el viento desde un distrito vecino, le llega un aviso al celular (y Gotita se lo dice
   al abrir la app). Se guarda el distrito en el celular y, en Firebase, el distrito con un código anónimo
   del celular para poder avisarle. Nada más. Es un pronóstico orientativo del modelo. */
(function () {
  if (window.__tbAlertasJs) return; window.__tbAlertasJs = 1;
  var FB = window.TB_FIREBASE && window.TB_FIREBASE.apiKey ? window.TB_FIREBASE : null, VAPID = window.TB_VAPID || '';
  var VER = '10.14.1', CLAVE = 'tb-alertas';
  var ua = navigator.userAgent || '';
  var IOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var INSTALADA = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var st = {};
  try { st = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { st = {}; }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(st)); } catch (e) {} }
  var guiaVista = false;
  try { guiaVista = !!(JSON.parse(localStorage.getItem('tb-guia-v1')) || {}).visto; } catch (e) {}

  window.__tbAlertas = {
    activas: function () { return !!st.ubigeo; },
    etiqueta: function () { return st.ubigeo ? 'Alertas: ' + st.distrito : 'Alertas de lluvia'; },
    abrir: hoja
  };

  /* ---------- utilidades ---------- */
  function cargar(src) {
    return new Promise(function (ok, mal) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { mal(new Error('sin conexión')); }; document.head.appendChild(s); });
  }
  var fbListo = null;
  function firebaseListo() {
    if (fbListo) return fbListo;
    fbListo = cargar('https://www.gstatic.com/firebasejs/' + VER + '/firebase-app-compat.js')
      .then(function () { return cargar('https://www.gstatic.com/firebasejs/' + VER + '/firebase-messaging-compat.js'); })
      .then(function () { if (!firebase.apps.length) firebase.initializeApp(FB); });
    fbListo.catch(function () { fbListo = null; });
    return fbListo;
  }
  // regiones con alertas, de norte a sur; el ubigeo empieza con el código de la región
  var REGIONES = ['Tumbes', 'Piura', 'Lambayeque', 'La Libertad'];
  var CAPITAL = { 'Tumbes': '240101', 'Piura': '200101', 'Lambayeque': '140101', 'La Libertad': '130101' };
  var PREF = { '24': 'Tumbes', '20': 'Piura', '14': 'Lambayeque', '13': 'La Libertad' };
  function regionDe(u) { return PREF[String(u).slice(0, 2)] || ''; }
  var DIST = null;
  function distritos() { return DIST ? Promise.resolve(DIST) : fetch('distritos.json').then(function (r) { return r.json(); }).then(function (d) { DIST = d; return d; }); }
  function escapar(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Firebase: sesión anónima, suscripción y código del celular ---------- */
  function sesion(reintento) {
    if (st.refresh && !reintento) {
      return fetch('https://securetoken.googleapis.com/v1/token?key=' + FB.apiKey, { method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(st.refresh) })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('sesión')); })
        .then(function (j) { return { id: j.id_token, uid: j.user_id }; })
        .catch(function () { return sesion(true); });
    }
    return fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + FB.apiKey, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.idToken) throw new Error('Firebase no abrió la sesión');
        st.refresh = j.refreshToken; st.uid = j.localId; guardar();
        return { id: j.idToken, uid: j.localId };
      });
  }
  function docUrl(uid) { return 'https://firestore.googleapis.com/v1/projects/' + FB.projectId + '/databases/(default)/documents/suscripciones/' + uid; }
  function guardarSuscripcion(token) {
    return sesion().then(function (s) {
      var f = { token: token, ubigeo: st.ubigeo, distrito: st.distrito, provincia: st.provincia, region: st.region,
        plataforma: IOS ? 'ios' : /android/i.test(ua) ? 'android' : 'otro' }, campos = {};
      Object.keys(f).forEach(function (k) { campos[k] = { stringValue: String(f[k] || '') }; });
      campos.actualizado = { timestampValue: new Date().toISOString() };
      return fetch(docUrl(s.uid), { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.id }, body: JSON.stringify({ fields: campos }) });
    }).then(function (r) {
      if (!r.ok) throw new Error('Firebase respondió ' + r.status);
      st.token = token; st.push = 1; st.guardado = Date.now(); guardar();
    });
  }
  function borrarSuscripcion() {
    if (!FB || !st.refresh) return Promise.resolve();
    return sesion().then(function (s) { return fetch(docUrl(s.uid), { method: 'DELETE', headers: { Authorization: 'Bearer ' + s.id } }); }).catch(function () {});
  }
  function codigoCelular() {
    return navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }).then(function (reg) {
      return firebaseListo().then(function () { return firebase.messaging().getToken({ vapidKey: VAPID, serviceWorkerRegistration: reg }); });
    }).then(function (t) { if (!t) throw new Error('el celular no dio un código para avisos'); return t; });
  }

  function kmEntre(a1, o1, a2, o2) {
    var r = Math.PI / 180, x = Math.sin((a2 - a1) * r / 2), y = Math.sin((o2 - o1) * r / 2);
    return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a1 * r) * Math.cos(a2 * r) * y * y));
  }

  /* ---------- la hoja para elegir el distrito ---------- */
  function hoja() {
    if (window.__tbAppCss) window.__tbAppCss();
    var viejo = document.getElementById('tb-al-hoja'); if (viejo) viejo.remove();
    var v = document.createElement('div'); v.className = 'tb-velo'; v.id = 'tb-al-hoja';
    v.innerHTML = '<div class="tb-hoja" role="dialog" aria-modal="true" aria-labelledby="tb-al-t"><button type="button" class="cerrar" aria-label="Cerrar">×</button>'
      + '<h3 id="tb-al-t">Alertas de lluvia de Gotita</h3>'
      + '<div class="tb-al-vig" aria-live="polite"><p class="tb-al-vt">Buscando los avisos de ahora…</p></div>'
      + '<p>Elige el distrito donde vives o trabajas. Si el pronóstico da lluvia allí, o si la lluvia viene con el viento desde un distrito vecino, te llega un aviso al celular.</p>'
      + '<div class="tb-al-reg" role="group" aria-label="Región">' + REGIONES.map(function (r) { return '<button type="button" data-r="' + r + '">' + r + '</button>'; }).join('') + '</div>'
      + ('geolocation' in navigator ? '<button type="button" class="tb-al-ubi">📍 Usar mi ubicación</button>' : '')
      + '<label class="tb-al-l" for="tb-al-sel">Distrito</label><select id="tb-al-sel" class="tb-al-sel"><option>Cargando…</option></select>'
      + '<p class="tb-al-priv">Solo se guarda tu distrito y un código anónimo del celular para enviarte el aviso; tu ubicación no se guarda. Puedes desactivarlo cuando quieras. Es un pronóstico orientativo del modelo.</p>'
      + '<p class="tb-al-priv">🔊 El aviso llega con la probabilidad de lluvia. Con la app abierta, o al tocar el aviso, Gotita lo lee con la misma voz del parlante; con la app cerrada, el celular vibra y suena su tono de notificaciones.</p>'
      + '<div class="acc"></div><p class="tb-al-msg" aria-live="polite"></p></div>';
    estilos();
    document.body.appendChild(v);
    var sel = v.querySelector('select'), msg = v.querySelector('.tb-al-msg'), acc = v.querySelector('.acc');
    var region = REGIONES.indexOf(st.region) >= 0 ? st.region : 'Piura';
    function llenar() {
      v.querySelectorAll('.tb-al-reg button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-r') === region ? 'true' : 'false'); });
      var html = '', prov = null;
      DIST.filter(function (d) { return d[3] === region; }).forEach(function (d) {
        if (d[2] !== prov) { if (prov) html += '</optgroup>'; prov = d[2]; html += '<optgroup label="Provincia de ' + escapar(prov) + '">'; }
        html += '<option value="' + d[0] + '"' + (d[0] === st.ubigeo ? ' selected' : '') + '>' + escapar(d[1]) + '</option>';
      });
      sel.innerHTML = html + '</optgroup>';
      if (!st.ubigeo || st.region !== region) {   // por omisión, la capital de la región
        sel.value = CAPITAL[region];
      }
    }
    v.querySelectorAll('.tb-al-reg button').forEach(function (b) { b.addEventListener('click', function () { region = b.getAttribute('data-r'); llenar(); }); });
    var ubi = v.querySelector('.tb-al-ubi');
    if (ubi) ubi.addEventListener('click', function () {   // la ubicación se usa solo aquí, para elegir el distrito: no se guarda ni se envía
      msg.textContent = 'Buscando tu ubicación…'; ubi.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        distritos().then(function (D) {
          var la = pos.coords.latitude, lo = pos.coords.longitude, mejor = null, km = 1e9;
          D.forEach(function (d) { var k = kmEntre(la, lo, d[4], d[5]); if (k < km) { km = k; mejor = d; } });
          ubi.disabled = false;
          if (!mejor || km > 60) { msg.innerHTML = 'Gotita avisa por ahora en <b>' + REGIONES.slice(0, -1).join(', ') + ' y ' + REGIONES[REGIONES.length - 1] + '</b>, y tu ubicación queda lejos de esas regiones. Puedes elegir un distrito de la lista.'; return; }
          region = mejor[3]; llenar(); sel.value = mejor[0];
          msg.innerHTML = 'Estás en <b>' + escapar(mejor[1]) + '</b> o cerca (provincia de ' + escapar(mejor[2]) + ', ' + escapar(mejor[3]) + '). Si es correcto, toca «' + escapar(act.textContent) + '».';
        });
      }, function () {
        ubi.disabled = false;
        msg.textContent = 'No pude saber tu ubicación: el celular no dio permiso o no tiene señal de GPS. Elige tu distrito en la lista.';
      }, { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 });
    });
    var act = document.createElement('button'); act.type = 'button'; act.className = 'tb-hb'; act.textContent = st.ubigeo ? 'Guardar' : 'Activar alertas';
    act.addEventListener('click', function () { activar(sel.value, msg, act); });
    acc.appendChild(act);
    if (st.ubigeo) {
      var des = document.createElement('button'); des.type = 'button'; des.className = 'tb-hb sec'; des.textContent = 'Desactivar';
      des.addEventListener('click', function () {
        msg.textContent = 'Desactivando…';
        borrarSuscripcion().then(function () {
          if (st.push && window.firebase && firebase.messaging) { try { firebase.messaging().deleteToken(); } catch (e) {} }
          st = { preguntado: 1 }; guardar();
          msg.innerHTML = 'Listo: ya no recibirás alertas de lluvia. Puedes volver a activarlas cuando quieras.';
          act.textContent = 'Activar alertas'; des.remove();
        });
      });
      acc.appendChild(des);
      if (st.push) {
        var pr = document.createElement('button'); pr.type = 'button'; pr.className = 'tb-hb sec'; pr.textContent = 'Probar el aviso';
        pr.addEventListener('click', function () {
          sonar(true, 'Prueba de alerta. Así te avisaré cuando venga lluvia a ' + (st.distrito || 'tu distrito') + ', con la probabilidad y los milímetros previstos.');
          notificar('Gotita: prueba de alerta', 'Así te llegará el aviso de lluvia para ' + (st.distrito || 'tu distrito') + ', con su probabilidad.', 'gotita-prueba').then(function (ok) {
            msg.innerHTML = ok ? 'Te mandé un aviso de prueba. ' + AYUDA_EMERGENTE : 'El celular no dejó mostrar el aviso: revisa que las notificaciones de esta app estén permitidas.';
          });
        });
        acc.appendChild(pr);
      }
    }
    v.addEventListener('click', function (ev) { if (ev.target === v || ev.target.classList.contains('cerrar')) v.remove(); });
    distritos().then(llenar).catch(function () { sel.innerHTML = '<option>No se pudo cargar la lista</option>'; });
    vigentes().then(function (V) {
      var caja = v.querySelector('.tb-al-vig'); if (!caja) return;
      caja.innerHTML = listaHtml(V);
      caja.querySelectorAll('button[data-u]').forEach(function (b) {
        b.addEventListener('click', function () {   // elegir ese distrito
          region = b.getAttribute('data-r');
          distritos().then(function () { llenar(); sel.value = b.getAttribute('data-u'); sel.focus(); sel.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
        });
      });
    });
  }
  function estilos() {
    if (document.getElementById('tb-al-css')) return;
    var s = document.createElement('style'); s.id = 'tb-al-css';
    s.textContent = '.tb-al-reg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:10px;background:#EEF2F7;margin:4px 0 12px}'
      + '.tb-al-reg button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:9px;background:transparent;color:#1B2B40;cursor:pointer}'
      + '.tb-al-reg button[aria-pressed="true"]{background:#0B2545;color:#fff}'
      + '.tb-al-l{display:block;font-weight:700;color:#0B2545;margin-bottom:4px}'
      + '.tb-al-sel{width:100%;font:inherit;font-size:16px;padding:10px;border:1px solid #C9D4E3;border-radius:9px;background:#fff;color:#0E1C2F}'
      + '.tb-al-priv{font-size:.82rem;color:#66768C;margin:10px 0}'
      + '.tb-al-msg{margin:10px 0 0;color:#0B2545;font-weight:600}.tb-al-msg:empty{display:none}'
      + '.tb-al-vig{margin:2px 0 12px;padding:10px 12px;border-radius:12px;background:#F5F8FC;border:1px solid #E2E8F0}'
      + '.tb-al-vt{margin:0 0 6px;font-size:.9rem;color:#0B2545}.tb-al-nada{margin:0;font-size:.9rem;color:#475569}'
      + '.tb-al-lista{list-style:none;margin:0;padding:0;max-height:210px;overflow:auto}'
      + '.tb-al-lista li{list-style:none;margin:0;padding:0;position:static;counter-increment:none;background:none}'
      + '.tb-al-lista li::before,.tb-al-lista li::marker{content:none!important;display:none!important}'
      + '.tb-al-lista li+li{border-top:1px solid #E2E8F0}'
      + '.tb-al-lista button{all:unset;display:block;width:100%;box-sizing:border-box;padding:8px 2px;cursor:pointer;color:#0E1C2F}'
      + '.tb-al-lista small{display:block;color:#475569;font-size:.8rem;line-height:1.3;margin-top:3px}'
      + '.tb-al-chip{display:inline-block;font-size:.72rem;font-weight:800;border-radius:999px;padding:2px 8px;margin-right:6px;vertical-align:1px}'
      + '.tb-al-rg{color:#66768C;font-size:.8rem}'
      + '.tb-al-ubi{display:block;width:100%;font:inherit;font-weight:700;border:1px solid #C9D4E3;border-radius:9px;padding:9px;margin:0 0 12px;background:#fff;color:#0B2545;cursor:pointer}'
      + '.tb-al-ubi:disabled{opacity:.6}';
    document.head.appendChild(s);
  }

  function activar(ubigeo, msg, boton) {
    var d = (DIST || []).find(function (x) { return x[0] === ubigeo; }); if (!d) return;
    var antes = st.ubigeo;
    st.ubigeo = d[0]; st.distrito = d[1]; st.provincia = d[2]; st.region = d[3]; st.preguntado = 1; guardar();
    var nombre = '<b>' + escapar(d[1]) + '</b>';
    function fin(html) {
      msg.innerHTML = html; boton.disabled = false; boton.textContent = 'Guardar';
      var pie = document.getElementById('tb-al-pie'); if (pie) pie.textContent = 'Alertas de lluvia: ' + d[1];
    }
    if (!FB || !VAPID) return fin('Guardé tu distrito: ' + nombre + '. Gotita te avisará cuando abras la app; los avisos con la app cerrada se activan muy pronto.');
    if (IOS && !INSTALADA) return fin('Guardé tu distrito: ' + nombre + '. En iPhone, los avisos llegan solo con la app instalada: toca <b>Compartir</b> → <b>«Agregar a inicio»</b>, ábrela desde su ícono y vuelve a tocar «Guardar» aquí.');
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator))
      return fin('Guardé tu distrito: ' + nombre + '. Este navegador no permite avisos al celular; Gotita te avisará cuando abras la app.');
    boton.disabled = true; msg.textContent = 'Pidiendo permiso para avisarte…';
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') {
        return fin('Guardé tu distrito, pero el navegador no dio permiso para avisos. Para activarlos, toca el candado de la barra de direcciones → <b>Permisos</b> → <b>Notificaciones</b> → <b>Permitir</b>, y vuelve a tocar «Guardar».');
      }
      msg.textContent = 'Activando los avisos…';
      return codigoCelular().then(guardarSuscripcion).then(function () {
        sonar(true, 'Alertas activadas. Te avisaré con mi voz cuando venga lluvia a ' + d[1] + '.'); notificar('Gotita: alertas activadas', 'Así te llegará el aviso cuando venga lluvia a ' + d[1] + '.', 'gotita-prueba');   // el globo del celular no lee negritas
        fin('Listo. Gotita te avisará si viene lluvia a ' + nombre + '. Te mandé un aviso de prueba. ' + AYUDA_EMERGENTE + ' Es un pronóstico orientativo; las alertas oficiales las dan el SENAMHI y el INDECI.');
      });
    }).catch(function (e) {
      if (!antes) st.push = 0;
      guardar();
      fin('Guardé tu distrito, pero no pude activar los avisos ahora (' + escapar(e && e.message || 'error') + '). Inténtalo de nuevo en un rato.');
    });
  }

  /* ---------- avisos vigentes en las regiones con alertas ---------- */
  var VIG = null;
  function vigentes() {
    if (VIG) return VIG;
    VIG = (FB ? fetch('https://firestore.googleapis.com/v1/projects/' + FB.projectId + '/databases/(default)/documents/alertas/vigentes?key=' + FB.apiKey)
      .then(function (r) { return r.ok ? r.json() : null; }) : Promise.resolve(null)).then(function (j) {
        var f = j && j.fields || {}, emitida = f.emitida && f.emitida.timestampValue, mapa = f.alertas && f.alertas.mapValue && f.alertas.mapValue.fields;
        if (!emitida || !mapa || Date.now() - new Date(emitida) > 3 * 3600e3) return { emitida: emitida, lista: [] };
        var orden = { fuerte: 0, lluvia: 1, 'se acerca': 2 }, lista = Object.keys(mapa).map(function (u) {
          var a = mapa[u].mapValue.fields, v = function (k) { return a[k] ? a[k].stringValue : ''; };
          return { u: u, distrito: v('distrito'), nivel: v('nivel'), titulo: v('titulo'), texto: v('texto'), region: regionDe(u) };
        });
        lista.sort(function (a, b) { return (orden[a.nivel] - orden[b.nivel]) || a.distrito.localeCompare(b.distrito, 'es'); });
        return { emitida: emitida, lista: lista };
      }).catch(function () { VIG = null; return { lista: [] }; });
    return VIG;
  }
  var NIVEL = { fuerte: ['Lluvia fuerte', '#B91C1C', '#FEE2E2'], lluvia: ['Lluvia', '#1D4ED8', '#DBEAFE'], 'se acerca': ['Se acerca', '#15803D', '#DCFCE7'] };
  function listaHtml(V) {
    if (!V.lista.length) return '<p class="tb-al-nada">Ahora no hay avisos de lluvia en ' + REGIONES.slice(0, -1).join(', ') + ' ni en ' + REGIONES[REGIONES.length - 1] + '.</p>';
    var hora = V.emitida ? new Date(V.emitida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' }) : '';
    var h = '<p class="tb-al-vt"><b>Avisos vigentes:</b> ' + V.lista.length + ' distrito' + (V.lista.length > 1 ? 's' : '') + (hora ? ' · revisado a las ' + hora : '') + '</p><ul class="tb-al-lista">';
    V.lista.forEach(function (a) {
      var n = NIVEL[a.nivel] || NIVEL.lluvia;
      h += '<li><button type="button" data-u="' + a.u + '" data-r="' + a.region + '"><span class="tb-al-chip" style="color:' + n[1] + ';background:' + n[2] + '">' + n[0] + '</span>'
        + '<b>' + escapar(a.distrito) + '</b> <span class="tb-al-rg">' + escapar(a.region) + '</span><small>' + escapar(a.texto.replace(/ Pronóstico orientativo\.$/, '')) + '</small></button></li>';
    });
    return h + '</ul>';
  }

  /* ---------- sonido de alerta y aviso arriba de la pantalla ---------- */
  var AYUDA_EMERGENTE = 'Si el aviso no apareció arriba de la pantalla o no sonó: mantén presionado el aviso de Gotita en la barra de notificaciones → ⚙ (Ajustes) → elige <b>Alerta</b> y activa <b>Mostrar como emergente</b> y el <b>sonido</b>. Al tocar el aviso, Gotita lo lee en voz alta.';
  // Vibración en pulsos (Android 8 o más usa la del canal de notificaciones).
  var VIBRA_SIRENA = [500, 200, 500, 200, 500];
  function sonar(fuerte, texto) {   // desde el 23 nov. 2026 sin sirena: vibra y Gotita lee el aviso con la voz del parlante
    if (!texto && Date.now() - (sonar.t || 0) < 15000) return;
    sonar.t = Date.now();
    try { if (navigator.vibrate) navigator.vibrate(fuerte === false ? [300] : VIBRA_SIRENA); } catch (e) {}
    if (!texto) return;
    var t = String(texto).replace(/<[^>]+>/g, '').replace(/^Gotita:\s*/, '').replace(/\s*Pronóstico orientativo\.?$/, '');
    var decirlo = function () { return window.__tbHablar ? window.__tbHablar(t) : false; };
    if (!decirlo()) return;
    // el navegador puede pedir un toque antes de hablar: entonces Gotita lo dice con el primer toque (hasta 2 minutos después)
    setTimeout(function () {
      try { if (speechSynthesis.speaking || speechSynthesis.pending) return; } catch (e) { return; }
      var alTocar = function () { quitar(); decirlo(); };
      var quitar = function () { document.removeEventListener('pointerdown', alTocar, true); document.removeEventListener('keydown', alTocar, true); };
      document.addEventListener('pointerdown', alTocar, true); document.addEventListener('keydown', alTocar, true);
      setTimeout(quitar, 120000);
    }, 1500);
  }
  function notificar(titulo, texto, tag) {   // el globo de aviso del celular, también con la app abierta
    if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return Promise.resolve(false);
    return navigator.serviceWorker.ready.then(function (r) {
      return r.showNotification(titulo, { body: texto, icon: 'icono-192.png', badge: 'icono-192.png', tag: tag || 'gotita',
        renotify: true, requireInteraction: true, silent: false, vibrate: VIBRA_SIRENA, data: { url: './' } }).then(function () { return true; });
    }).catch(function () { return false; });
  }

  /* ---------- al abrir la app ---------- */
  function decir(html, botones) {
    if (window.__tbGotitaDecir && window.__tbGotitaDecir(html, botones)) return;
    if (window.__tbAppBarra) window.__tbAppBarra('tb-al-barra', html, botones && botones[1] ? botones[1].t : null, botones && botones[1] ? botones[1].f : null, false);
  }
  function alertaVigente() {
    if (!FB) return;
    vigentes().then(function (V) {
      if (!V.lista.length) return;
      var mia = st.ubigeo && V.lista.filter(function (a) { return a.u === st.ubigeo; })[0];
      if (mia) {   // hay aviso en el distrito elegido
        var clave = V.emitida + st.ubigeo; if (st.vista === clave) return;
        st.vista = clave; guardar();
        sonar(true, mia.titulo + '. ' + mia.texto); notificar(mia.titulo, mia.texto, 'lluvia-' + mia.u);
        return decir('<b>' + escapar(mia.titulo.replace(/^Gotita: /, '')) + '</b>. ' + escapar(mia.texto), [{ t: 'Entendido', prim: true, f: function () {} }]);
      }
      if (Date.now() - (st.region_visto || 0) < 3 * 3600e3) return;   // el resumen de la región, a lo más cada 3 horas
      st.region_visto = Date.now(); st.preguntado = 1; guardar();
      var n = V.lista.length, nombres = V.lista.slice(0, 3).map(function (a) { return escapar(a.distrito) + (a.nivel === 'fuerte' ? ' (lluvia fuerte)' : ''); });
      var txt = 'Ahora hay avisos de lluvia en <b>' + n + ' distrito' + (n > 1 ? 's' : '') + '</b>: ' + nombres.join(', ') + (n > 3 ? ' y ' + (n - 3) + ' más' : '') + '.';
      sonar(false, txt + (st.ubigeo ? ' En ' + st.distrito + ' no hay aviso por ahora.' : ''));
      if (st.ubigeo) notificar('Gotita: avisos de lluvia en ' + n + ' distrito' + (n > 1 ? 's' : ''), V.lista.slice(0, 3).map(function (a) { return a.distrito; }).join(', ') + (n > 3 ? ' y ' + (n - 3) + ' más' : '') + '. En ' + st.distrito + ' no hay aviso por ahora.', 'gotita-region');
      if (st.ubigeo) decir(txt + ' En ' + escapar(st.distrito) + ' no hay aviso por ahora.', [{ t: 'Entendido', f: function () {} }, { t: 'Ver la lista', prim: true, f: hoja }]);
      else decir(txt + ' ¿Te aviso cuando venga lluvia a tu distrito?', [{ t: 'Ahora no', f: function () {} }, { t: 'Ver avisos y elegir', prim: true, f: hoja }]);
    });
  }
  function mantener() {
    // el código del celular puede cambiar: se revisa al abrir y se vuelve a guardar si cambió (o cada 7 días)
    // también reintenta si el primer intento falló (st.push vacío) pero el celular ya dio permiso
    if (!FB || !VAPID || !st.ubigeo || !('Notification' in window) || Notification.permission !== 'granted') return;
    codigoCelular().then(function (t) {
      if (t !== st.token || Date.now() - (st.guardado || 0) > 7 * 864e5) return guardarSuscripcion(t);
    }).catch(function () {});
    firebaseListo().then(function () {
      firebase.messaging().onMessage(function (p) {   // aviso que llega con la app abierta: lo dice Gotita
        var d = (p && p.data) || {}; if (!d.titulo) return;
        sonar(true, d.titulo + '. ' + (d.texto || '')); notificar(d.titulo, d.texto || '', 'lluvia-' + (d.ubigeo || ''));
        decir('<b>' + escapar(d.titulo.replace(/^Gotita: /, '')) + '</b>. ' + escapar(d.texto || ''), [{ t: 'Entendido', prim: true, f: function () {} }]);
      });
    }).catch(function () {});
  }
  function preguntar() {
    if (st.ubigeo || st.preguntado) return;
    if (!guiaVista) { st.preguntado = 1; guardar(); return; }   // la primera vez lo ofrece Gotita al final del recorrido
    setTimeout(function () {
      if (st.ubigeo || st.preguntado) return;
      st.preguntado = 1; guardar();
      decir('¿Quieres que te avise cuando venga <b>lluvia a tu distrito</b>?', [{ t: 'Ahora no', f: function () {} }, { t: 'Sí, elegir distrito', prim: true, f: hoja }]);
    }, 15000);
  }
  function alPie() {
    var pie = document.querySelector('.tb-footer'); if (!pie || document.getElementById('tb-al-pie')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'tb-al-pie';
    b.textContent = st.ubigeo ? 'Alertas de lluvia: ' + st.distrito : 'Activar alertas de lluvia';
    b.style.cssText = 'font:inherit;font-weight:700;border:1px solid #FCD34D;background:#FFFBEB;color:#92400E;border-radius:8px;padding:6px 12px;cursor:pointer;margin:0 8px 8px 0';
    b.addEventListener('click', hoja);
    var p = document.getElementById('tb-app-pie');
    if (p) p.insertBefore(b, p.firstChild); else { p = document.createElement('p'); p.appendChild(b); pie.insertBefore(p, pie.firstChild); }
  }
  function sirenaDelAviso() {
    if (/[?&]sirena=1/.test(location.search)) {   // se abrió tocando el aviso: vibra y Gotita lo dice con su voz
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
      sonar(); st.vista = ''; guardar();
    }
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && (e.data.tipo === 'aviso' || e.data.tipo === 'sirena')) sonar(true, e.data.titulo ? e.data.titulo + '. ' + (e.data.texto || '') : '');
    });
  }
  function iniciar() { sirenaDelAviso(); alPie(); setTimeout(function () { alertaVigente(); mantener(); preguntar(); }, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
