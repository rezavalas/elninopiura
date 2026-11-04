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

  /* ---------- la hoja para elegir el distrito ---------- */
  function hoja() {
    if (window.__tbAppCss) window.__tbAppCss();
    var viejo = document.getElementById('tb-al-hoja'); if (viejo) viejo.remove();
    var v = document.createElement('div'); v.className = 'tb-velo'; v.id = 'tb-al-hoja';
    v.innerHTML = '<div class="tb-hoja" role="dialog" aria-modal="true" aria-labelledby="tb-al-t"><button type="button" class="cerrar" aria-label="Cerrar">×</button>'
      + '<h3 id="tb-al-t">Alertas de lluvia de Gotita</h3>'
      + '<p>Elige el distrito donde vives o trabajas. Si el pronóstico da lluvia allí, o si la lluvia viene con el viento desde un distrito vecino, te llega un aviso al celular.</p>'
      + '<div class="tb-al-reg" role="group" aria-label="Región"><button type="button" data-r="Piura">Piura</button><button type="button" data-r="La Libertad">La Libertad</button></div>'
      + '<label class="tb-al-l" for="tb-al-sel">Distrito</label><select id="tb-al-sel" class="tb-al-sel"><option>Cargando…</option></select>'
      + '<p class="tb-al-priv">Solo se guarda tu distrito y un código anónimo del celular para enviarte el aviso. Puedes desactivarlo cuando quieras. Es un pronóstico orientativo del modelo.</p>'
      + '<div class="acc"></div><p class="tb-al-msg" aria-live="polite"></p></div>';
    estilos();
    document.body.appendChild(v);
    var sel = v.querySelector('select'), msg = v.querySelector('.tb-al-msg'), acc = v.querySelector('.acc');
    var region = st.region || 'Piura';
    function llenar() {
      v.querySelectorAll('.tb-al-reg button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-r') === region ? 'true' : 'false'); });
      var html = '', prov = null;
      DIST.filter(function (d) { return d[3] === region; }).forEach(function (d) {
        if (d[2] !== prov) { if (prov) html += '</optgroup>'; prov = d[2]; html += '<optgroup label="Provincia de ' + escapar(prov) + '">'; }
        html += '<option value="' + d[0] + '"' + (d[0] === st.ubigeo ? ' selected' : '') + '>' + escapar(d[1]) + '</option>';
      });
      sel.innerHTML = html + '</optgroup>';
      if (!st.ubigeo || st.region !== region) {   // por omisión, la capital de la región
        var cap = region === 'Piura' ? '200101' : '130101';
        sel.value = cap;
      }
    }
    v.querySelectorAll('.tb-al-reg button').forEach(function (b) { b.addEventListener('click', function () { region = b.getAttribute('data-r'); llenar(); }); });
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
    }
    v.addEventListener('click', function (ev) { if (ev.target === v || ev.target.classList.contains('cerrar')) v.remove(); });
    distritos().then(llenar).catch(function () { sel.innerHTML = '<option>No se pudo cargar la lista</option>'; });
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
      + '.tb-al-msg{margin:10px 0 0;color:#0B2545;font-weight:600}.tb-al-msg:empty{display:none}';
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
        fin('Listo. Gotita te avisará si viene lluvia a ' + nombre + '. Es un pronóstico orientativo; las alertas oficiales las dan el SENAMHI y el INDECI.');
      });
    }).catch(function (e) {
      if (!antes) st.push = 0;
      guardar();
      fin('Guardé tu distrito, pero no pude activar los avisos ahora (' + escapar(e && e.message || 'error') + '). Inténtalo de nuevo en un rato.');
    });
  }

  /* ---------- al abrir la app ---------- */
  function decir(html, botones) {
    if (window.__tbGotitaDecir && window.__tbGotitaDecir(html, botones)) return;
    if (window.__tbAppBarra) window.__tbAppBarra('tb-al-barra', html, botones && botones[1] ? botones[1].t : null, botones && botones[1] ? botones[1].f : null, false);
  }
  function alertaVigente() {
    if (!FB || !st.ubigeo) return;
    fetch('https://firestore.googleapis.com/v1/projects/' + FB.projectId + '/databases/(default)/documents/alertas/vigentes?key=' + FB.apiKey)
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j || !j.fields) return;
        var emitida = j.fields.emitida && j.fields.emitida.timestampValue, mapa = j.fields.alertas && j.fields.alertas.mapValue && j.fields.alertas.mapValue.fields;
        if (!emitida || !mapa || Date.now() - new Date(emitida) > 3 * 3600e3) return;
        var a = mapa[st.ubigeo] && mapa[st.ubigeo].mapValue && mapa[st.ubigeo].mapValue.fields; if (!a) return;
        var clave = emitida + st.ubigeo; if (st.vista === clave) return;
        st.vista = clave; guardar();
        decir('<b>' + escapar(a.titulo.stringValue.replace(/^Gotita: /, '')) + '</b>. ' + escapar(a.texto.stringValue), [{ t: 'Entendido', prim: true, f: function () {} }]);
      }).catch(function () {});
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
  function iniciar() { alPie(); setTimeout(function () { alertaVigente(); mantener(); preguntar(); }, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
