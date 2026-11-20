/* Organización de la app El Niño Piura (20 nov. 2026).
   Barra de cinco secciones (Inicio, Pronóstico, Radar/satélite, Mapa de calor, El Niño), ubicación con distrito,
   campana de avisos, Inicio con el pronóstico del día y accesos rápidos, menú y recorrido de Gotita, y mapa de calor
   con la temperatura de los distritos del norte. Solo corre en la app instalable: index.html la agrega al tablero;
   el tablero privado y la página de Apps Script no la traen. Se apoya en lo que el tablero ya tiene (pestañas,
   datos de window.dash, Gotita, alertas.js y app.js).
   Elaboración: Raúl Edwin Zavala Sánchez · ORCID 0009-0001-9352-7682 */
(function () {
  if (window.__tbShell) return; window.__tbShell = 1;
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var TOUR = 'tb-sh-recorrido-v1';
  // El recorrido de antes señala la barra de pestañas, que en la app ya no se ve: se marca como visto
  // (alertas.js ya leyó si estaba visto, así su pregunta queda para el final del recorrido nuevo).
  var gv = LS.get('tb-guia-v1', {}) || {}; if (!gv.visto) { gv.visto = 1; LS.set('tb-guia-v1', gv); }
  var H = document.documentElement;
  H.classList.add('sh'); H.setAttribute('data-shv', 'inicio');

  var RELAY = (self.TB_RELAY || 'https://openmeteo-piura.rezavalas.workers.dev') + '/api.open-meteo.com/v1/forecast';
  // Pronóstico por hora de los 199 distritos que GitHub descarga cada media hora (pronostico.py, rama «datos»). La app lo lee de ahí
  // y no de Open-Meteo: así no gasta el cupo diario del relay, que usan las alertas de Gotita.
  var PRON_GH = 'https://raw.githubusercontent.com/rezavalas/elninopiura/refs/heads/datos/pronostico.json';
  var ZONA_DEF = ['200101', 'Piura', 'Piura', 'Piura', -5.1945, -80.6328];
  var DIAS = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];
  var REDUCIR = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- íconos ---------- */
  var P = {
    inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    pron: '<path d="M12 2.5v2M5.6 5.1l1.4 1.4M2.5 11.5h2M18.4 5.1 17 6.5"/><path d="M8.2 11.6a4 4 0 0 1 7.3-2.3"/><path d="M7 20h10a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 7 20z"/>',
    radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18 6"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    calor: '<path d="M11 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M9 9v7"/><path d="M15.5 4.5c1.2 1.2 1.2 2.3 0 3.5s-1.2 2.3 0 3.5M19.5 4.5c1.2 1.2 1.2 2.3 0 3.5s-1.2 2.3 0 3.5"/>',
    nino: '<path d="M2 18.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M14 11.2V5a2 2 0 0 0-4 0v6.2a3.4 3.4 0 1 0 4 0z"/>',
    pin: '<path d="M12 21s-7-6.3-7-11.5a7 7 0 0 1 14 0C19 14.7 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    gps: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
    der: '<path d="m9 6 6 6-6 6"/>',
    campana: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    voz: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    rio: '<path d="M3 7c3 0 3 2 6 2s3-2 6-2 3 2 6 2"/><path d="M3 12c3 0 3 2 6 2s3-2 6-2 3 2 6 2"/><path d="M3 17c3 0 3 2 6 2s3-2 6-2 3 2 6 2"/>',
    graf: '<path d="M4 4v16h16"/><path d="m8 15 3-4 3 2 5-6"/>',
    sirena: '<path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 18h14v3H5z"/><path d="M12 2.5v2M4.2 6.2l1.4 1.4M19.8 6.2l-1.4 1.4"/>',
    cel: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 8v6M9.5 11.5 12 14l2.5-2.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    ruta: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    lapiz: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    gota: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>',
    lluvia: '<path d="M7 15h10a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 7 15z"/><path d="m9 18-1 3M13 18l-1 3M17 18l-1 3"/>',
    llovizna: '<path d="M7 15h10a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 7 15z"/><path d="M9 18.5v.5M12 20v.5M15 18.5v.5"/>',
    tormenta: '<path d="M7 15h10a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 7 15z"/><path d="m12.5 15.5-2 3.5h3l-2 3.5"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    nube: '<path d="M7 18h10a4 4 0 0 0 .6-7.95 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18z"/>'
  };
  function ic(n, s, c, w) {
    return '<svg aria-hidden="true" width="' + (s || 22) + '" height="' + (s || 22) + '" viewBox="0 0 24 24" fill="none" stroke="' + (c || 'currentColor')
      + '" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + P[n] + '</svg>';
  }
  function icCielo(t, s, c) {
    t = String(t || '').toLowerCase();
    var n = /tormenta/.test(t) ? 'tormenta' : /llovizna|débil/.test(t) ? 'llovizna' : /lluvia|chubasco/.test(t) ? 'lluvia'
      : /despejado|soleado/.test(t) && !/parcial|mayormente nublado/.test(t) ? 'sol' : /parcial/.test(t) ? 'pron' : 'nube';
    return ic(n, s || 26, c || '#4338CA');
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(x, d) { if (x == null || x === '' || isNaN(+x)) return '—'; return (+x).toFixed(d || 0).replace('.', ','); }
  function r0(x) { return x == null || isNaN(+x) ? '—' : String(Math.round(+x)); }
  function dia(f) { var d = new Date(String(f).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? '' : DIAS[d.getDay()] + ' ' + d.getDate(); }
  function hoyLima() { var d = new Date(Date.now() - 5 * 3600e3); return d.toISOString().slice(0, 10); }
  function filas(id) {
    try { var d = window.dash && window.dash.data(id), x = d && d.data; return Array.isArray(x) ? x : (x && (x.rows || x.data)) || []; } catch (e) { return []; }
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function gotitaSvg(clase) {
    var g = $('#tb-g-ava svg') || $('.gx');
    if (!g) return '';
    var c = g.cloneNode(true); c.setAttribute('class', 'gx ' + (clase || '')); c.removeAttribute('style'); c.setAttribute('aria-hidden', 'true');
    return c.outerHTML;
  }

  /* ---------- distritos y zona elegida ---------- */
  var DIST = null, pDist = null;
  function distritos() {
    if (DIST) return Promise.resolve(DIST);
    if (!pDist) pDist = fetch('distritos.json').then(function (r) { return r.json(); }).then(function (d) { DIST = d; return d; })
      .catch(function (e) { pDist = null; throw e; });
    return pDist;
  }
  function zona() { var z = LS.get('tb-sh-zona', null); return Array.isArray(z) && z.length >= 6 ? z : ZONA_DEF; }
  function zonaElegida() { return Array.isArray(LS.get('tb-sh-zona', null)); }
  function ponerZona(d) {
    LS.set('tb-sh-zona', d);
    pintarLugar(); pintarZona(); aplicarZona();
    if (CAL.mapa) { CAL.mapa.setView([d[4], d[5]], Math.max(CAL.mapa.getZoom(), 9)); lecturaZona(); }
  }
  function kmEntre(a1, o1, a2, o2) {
    var R = 6371, r = Math.PI / 180, dA = (a2 - a1) * r, dO = (o2 - o1) * r;
    var x = Math.sin(dA / 2) * Math.sin(dA / 2) + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) * Math.sin(dO / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function masCercano(D, la, lo) { var m = null, km = 1e9; D.forEach(function (d) { var k = kmEntre(la, lo, d[4], d[5]); if (k < km) { km = k; m = d; } }); return { d: m, km: km }; }
  function ubicarme() {
    return new Promise(function (ok, mal) {
      if (!navigator.geolocation) return mal(new Error('Este equipo no da su ubicación.'));
      navigator.geolocation.getCurrentPosition(function (p) { ok(p.coords); }, function (e) {
        mal(new Error(e && e.code === 1 ? 'No diste permiso para usar tu ubicación. Puedes elegir tu distrito en la lista.' : 'No pude saber dónde estás. Prueba otra vez o elige tu distrito.'));
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
    });
  }

  try { distritos().catch(function () {}); } catch (e) {}   // listo antes de armar la página

  /* ---------- vistas ---------- */
  var VISTAS = {
    inicio: { tab: null, nav: 'inicio' },
    pron: { tab: 'tab-tiempo', nav: 'pron', t: 'Pronóstico', s: 'Diez días por estación y la lluvia hora por hora' },
    reg: { tab: 'tab-graf', nav: 'pron', t: 'Registro', s: 'Gráficas por estación, de 24 horas a 1 año' },
    radar: { tab: 'tab-vivo', nav: 'radar', t: 'Radar y satélite', s: 'Del SENAMHI: radar cada 5 min y satélite GOES-19 cada 10 min' },
    calor: { tab: null, nav: 'calor', t: 'Mapa de calor', s: 'La temperatura de los 199 distritos del norte, según el modelo' },
    nino: { tab: 'tab-mar', nav: 'nino', t: 'El Niño Costero', s: 'El mar, el ICEN y la probabilidad oficial del ENFEN' },
    avisos: { tab: 'tab-avisos', nav: null, t: 'Avisos y ríos', s: 'Lo vigente primero; después los ríos y los impactos' }
  };
  var TAB2V = { tiempo: 'pron', graficas: 'reg', vivo: 'radar', mar: 'nino', avisos: 'avisos' };
  var NAV = [['inicio', 'Inicio', 'inicio'], ['pron', 'Pronóstico', 'pron'], ['radar', 'Radar/satélite', 'radar'], ['calor', 'Mapa de calor', 'calor'], ['nino', 'El Niño', 'nino']];
  var vista = 'inicio', sincronizando = false;
  // La zona elegida manda en todo el tablero: región (Piura, Trujillo y las que se agreguen) y estación más cercana,
  // también en la cabecera («Ahora» y la fila de estaciones). Las regiones y sus estaciones se leen del propio tablero
  // (var REG = { piura: { est: [...] }, ... } en su código), así una región nueva funciona sin tocar este archivo.
  // Coordenadas: las de abajo (las mismas del tablero), window.TB_EST_XY si el tablero las publica, o la capital del
  // distrito que se llama igual que la estación (distritos.json).
  var EST_XY = {
    'Piura': [-5.19, -80.63], 'Talara': [-4.58, -81.27], 'Chulucanas': [-5.1083, -80.1694], 'Lancones': [-4.6428, -80.5472],
    'Canchaque': [-5.4006, -79.6053], 'El Virrey': [-5.5358, -79.9842], 'Sechura': [-5.557, -80.822], 'Sullana': [-4.889, -80.687],
    'Trujillo': [-8.087, -79.109], 'Pacasmayo': [-7.4029, -79.5685], 'Casa Grande': [-7.7446, -79.1879], 'Virú': [-8.4143, -78.7522],
    'Otuzco': [-7.9025, -78.5657], 'Huamachuco': [-7.8155, -78.0487]
  };
  var ESTZ = null;   // { r: región del tablero, e: estación, km }
  function sinTilde(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function regionesPagina() {
    var out = {};
    [].forEach.call(document.scripts, function (sc) {
      var t = sc.textContent || '', m0 = /var REG\s*=\s*\{/.exec(t); if (!m0) return;
      var fin = t.indexOf('\n};', m0.index); var seg = t.slice(m0.index, fin > 0 ? fin : m0.index + 8000);
      var re = /([a-z_]+)\s*:\s*\{[^{}]*?\best\s*:\s*\[([^\]]*)\]/g, m;   // est puede no ir primero (pref, medidas…)
      while ((m = re.exec(seg))) { var L = (m[2].match(/'[^']+'|"[^"]+"/g) || []).map(function (x) { return x.slice(1, -1); }); if (L.length) out[m[1]] = L; }
    });
    if (!Object.keys(out).length) {   // respaldo: lo que muestren los botones
      var b = $('#reg-tiempo button[aria-pressed="true"]'), r = b && b.getAttribute('data-v');
      if (r) out[r] = [].map.call(document.querySelectorAll('#sel-est button[data-v]'), function (x) { return x.getAttribute('data-v'); });
    }
    return out;
  }
  function coordEst(e, D, reg) {
    var X = window.TB_EST_XY || {};
    if (X[e]) return X[e];
    if (EST_XY[e]) return EST_XY[e];
    var n = sinTilde(e), c = (D || []).filter(function (d) { return sinTilde(d[1]) === n; });
    if (c.length > 1 && reg) { var c2 = c.filter(function (d) { return sinTilde(d[3]).indexOf(sinTilde(reg).slice(0, 4)) >= 0; }); if (c2.length) c = c2; }
    return c.length ? [c[0][4], c[0][5]] : null;
  }
  function pulsar(sel, v) {
    var b = null; document.querySelectorAll(sel + ' button[data-v]').forEach(function (x) { if (x.getAttribute('data-v') === v) b = x; });
    if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
    return !!b;
  }
  function aplicarZona() {
    var z = zona(), R = regionesPagina();
    if (!Object.keys(R).length) return Promise.resolve(null);
    function calcular(D, solo) {
      var mejor = null, faltan = 0;
      Object.keys(R).forEach(function (rk) {
        if (solo && solo.indexOf(rk) < 0) return;
        R[rk].forEach(function (e) {
          var xy = coordEst(e, D, rk); if (!xy) { faltan++; return; }
          var km = kmEntre(z[4], z[5], xy[0], xy[1]);
          if (!mejor || km < mejor.km) mejor = { r: rk, e: e, km: km };
        });
      });
      return { m: mejor, faltan: faltan };
    }
    function poner(m, D) {
      if (!m) return null;
      ESTZ = m;
      pulsar('#reg-tiempo', m.r);   // región en la cabecera y en Pronóstico
      pulsar('#sel-est', m.e);      // estación más cercana
      if (!pulsar('#reg-cau', m.r)) {   // ríos: la misma región o, si no tiene, la región con ríos más cercana
        var conRios = [].map.call(document.querySelectorAll('#reg-cau button[data-v]'), function (b) { return b.getAttribute('data-v'); });
        var mc = calcular(D, conRios).m; if (mc) pulsar('#reg-cau', mc.r);
      }
      pintarInicio();
      return m;
    }
    // con las coordenadas conocidas se aplica al instante (sin parpadeo de Piura); si una estación nueva no las tiene,
    // se completa con distritos.json
    var c = calcular(DIST);
    if (!c.faltan && c.m) return Promise.resolve(poner(c.m, DIST));
    if (c.m) poner(c.m, DIST);
    return distritos().then(function (D) { return poner(calcular(D).m, D); }).catch(function () { return c.m; });
  }
  // Primera vez sin zona elegida: el distrito de las alertas, o el GPS si ya hay permiso; si no, Gotita lo ofrece una vez.
  function zonaInicial() {
    var al = LS.get('tb-alertas', null);
    if (al && al.ubigeo) {
      distritos().then(function (D) { var d = D.filter(function (x) { return x[0] === al.ubigeo; })[0]; if (d && !zonaElegida()) ponerZona(d); }).catch(function () {});
      return;
    }
    function porGps() {
      ubicarme().then(function (c) { return distritos().then(function (D) { return masCercano(D, c.latitude, c.longitude); }); })
        .then(function (m) { if (m.d && m.km < 80 && !zonaElegida()) ponerZona(m.d); }).catch(function () {});
    }
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(function (st) { if (st.state === 'granted') porGps(); else if (st.state === 'prompt') ofrecerUbicacion(); }).catch(function () { ofrecerUbicacion(); });
    } else ofrecerUbicacion();
  }
  function ofrecerUbicacion() {
    if (LS.get('tb-sh-ofreci-ubic', 0)) return;
    function intentar() {
      if (zonaElegida()) return;
      if (TOURA || hojaAbierta) return setTimeout(intentar, 4000);
      LS.set('tb-sh-ofreci-ubic', 1);
      if (window.__tbGotitaDecir) window.__tbGotitaDecir('¿Te ubico? Así te muestro el tiempo, el pronóstico y los ríos de <b>tu zona</b>.',
        [{ t: 'Sí, ubícame', prim: true, f: function () { var b = $('#sh-gps'); if (b) gpsRapido(b); } }, { t: 'Elegir distrito', f: function () { hojaLugar(); } }], 0);
    }
    setTimeout(intentar, 4000);
  }
  function irVista(v, empujar) {
    if (!VISTAS[v]) v = 'inicio';
    var V = VISTAS[v];
    vista = v; H.setAttribute('data-shv', v);
    // la entrada nueva del historial va antes del cambio de pestaña: el tablero reemplaza el estado al cambiarla (#pestaña)
    if (empujar !== false) try { history.pushState({ shv: v }, ''); } catch (e) {}
    if (V.tab) {
      var b = document.getElementById(V.tab);
      if (b && b.getAttribute('aria-selected') !== 'true') { sincronizando = true; b.click(); sincronizando = false; }
    }
    try { history.replaceState({ shv: v }, '', location.href); } catch (e) {}
    if (v === 'avisos') pintarMis();
    document.querySelectorAll('.sh-nav button').forEach(function (n) {
      if (n.getAttribute('data-v') === V.nav) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
    });
    var t = $('.sh-titulo');
    if (t) { t.querySelector('h2').textContent = V.t || ''; t.querySelector('p').textContent = V.s || ''; }
    document.querySelectorAll('#sh-seg-pron button').forEach(function (s) { s.setAttribute('aria-pressed', s.getAttribute('data-v') === v ? 'true' : 'false'); });
    if (v === 'calor') abrirCalor();
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  // En Inicio y en el mapa de calor no se ve ninguna pestaña del tablero: los avisos de Gotita al bajar
  // («llegaste al final de…») no corresponden ahí. Este escucha va antes que el de Gotita y lo frena.
  window.addEventListener('scroll', function (e) { if (vista === 'inicio' || vista === 'calor') e.stopImmediatePropagation(); }, { passive: true });
  window.addEventListener('popstate', function (e) {
    var s = e.state && e.state.shv; if (cerrarHoja()) return;
    irVista(s || 'inicio', false);
  });

  /* ---------- hojas ---------- */
  var hojaAbierta = null, focoAntes = null;
  function hoja(titulo, cuerpo, alAbrir) {
    cerrarHoja();
    focoAntes = document.activeElement;
    var v = el('div', { 'class': 'sh-velo' });
    v.innerHTML = '<div class="sh-hoja" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '"><div class="sh-hoja-cab"><h3>' + esc(titulo)
      + '</h3><button type="button" class="sh-x" aria-label="Cerrar">' + ic('x', 20) + '</button></div>' + cuerpo + '</div>';
    v.addEventListener('click', function (ev) { if (ev.target === v || ev.target.closest('.sh-x')) cerrarHoja(); });
    document.body.appendChild(v); hojaAbierta = v;
    var x = v.querySelector('.sh-x'); if (x) x.focus();
    if (alAbrir) alAbrir(v);
    return v;
  }
  function cerrarHoja() {
    if (!hojaAbierta) return false;
    hojaAbierta.remove(); hojaAbierta = null;
    if (focoAntes && focoAntes.focus) try { focoAntes.focus(); } catch (e) {}
    return true;
  }
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { if (TOURA) terminarTour(); else cerrarHoja(); } });

  /* ---------- barra superior ---------- */
  function pintarLugar() {
    var z = zona(), b = $('#sh-lugar b');
    if (b) b.textContent = z[1] + ' · ' + z[2] + ' · ' + z[3];
    var l = $('#sh-lugar'); if (l) l.setAttribute('aria-label', 'Cambiar ubicación: ' + z[1] + ', ' + z[2] + ', ' + z[3]);
  }
  function vigentes() { return filas('avisos').filter(function (a) { return /^vigente/i.test(String(a.estado || '')); }); }
  function pintarCampana() {
    var c = $('#sh-campana'); if (!c) return;
    var V = vigentes(), n = V.length, fuerte = V.some(function (a) { return /rojo|naranja|extrem|alerta|emergencia|fuerte/i.test(String(a.nivel || '')); });
    c.classList.toggle('sh-hay', !!fuerte);
    var b = c.querySelector('.sh-badge'); b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n);
    c.setAttribute('aria-label', n ? 'Avisos vigentes: ' + n + '. Ver avisos y ríos' : 'Ver avisos y ríos');
  }
  function hojaLugar() {
    var z = zona(), reg = z[3];
    hoja('Elige tu ubicación', '<button type="button" class="sh-op" id="sh-l-gps"><span class="sh-ai" style="background:#E0E7FF">' + ic('gps', 22, '#3730A3') + '</span>'
      + '<span><b>Usar mi ubicación</b><small>Busca el distrito donde estás; no se guarda tu posición</small></span></button>'
      + '<p id="sh-l-msg" class="sh-fuente" role="status"></p>'
      + '<input class="sh-buscar" id="sh-l-q" type="search" placeholder="Busca tu distrito o provincia" aria-label="Busca tu distrito o provincia" autocomplete="off">'
      + '<div class="sh-regs" role="group" aria-label="Región"></div><div class="sh-lista" id="sh-l-lista"></div>', function (v) {
      var q = v.querySelector('#sh-l-q'), lista = v.querySelector('#sh-l-lista'), regs = v.querySelector('.sh-regs'), msg = v.querySelector('#sh-l-msg');
      distritos().then(function (D) {
        var R = []; D.forEach(function (d) { if (R.indexOf(d[3]) < 0) R.push(d[3]); });
        regs.innerHTML = R.map(function (r) { return '<button type="button" data-r="' + esc(r) + '">' + esc(r) + '</button>'; }).join('');
        function llenar() {
          var t = q.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
          regs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', !t && b.getAttribute('data-r') === reg ? 'true' : 'false'); });
          var L = D.filter(function (d) {
            if (!t) return d[3] === reg;
            return (d[1] + ' ' + d[2]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(t) >= 0;
          }).slice(0, 120);
          lista.innerHTML = L.map(function (d) {
            return '<button type="button" data-u="' + d[0] + '"' + (d[0] === zona()[0] ? ' aria-current="true"' : '') + '><span>' + esc(d[1]) + '</span><small>' + esc(d[2] + ' · ' + d[3]) + '</small></button>';
          }).join('') || '<p class="sh-fuente" style="padding:12px">No encontré ese nombre.</p>';
        }
        regs.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b) return; reg = b.getAttribute('data-r'); q.value = ''; llenar(); });
        q.addEventListener('input', llenar);
        lista.addEventListener('click', function (ev) {
          var b = ev.target.closest('button[data-u]'); if (!b) return;
          var d = D.filter(function (x) { return x[0] === b.getAttribute('data-u'); })[0]; if (d) { ponerZona(d); cerrarHoja(); }
        });
        llenar();
      }).catch(function () { lista.innerHTML = '<p class="sh-fuente" style="padding:12px">No pude abrir la lista de distritos. Revisa la conexión.</p>'; });
      v.querySelector('#sh-l-gps').addEventListener('click', function () {
        msg.textContent = 'Buscando dónde estás…';
        ubicarme().then(function (c) { return distritos().then(function (D) { return masCercano(D, c.latitude, c.longitude); }); })
          .then(function (m) {
            if (!m.d || m.km > 80) { msg.textContent = 'Estás fuera de Tumbes, Piura, Lambayeque y La Libertad: elige un distrito de la lista.'; return; }
            ponerZona(m.d); cerrarHoja();
          }).catch(function (e) { msg.textContent = e.message; });
      });
    });
  }
  function gpsRapido(btn) {
    btn.disabled = true;
    ubicarme().then(function (c) { return distritos().then(function (D) { return masCercano(D, c.latitude, c.longitude); }); })
      .then(function (m) {
        btn.disabled = false;
        if (!m.d || m.km > 80) { decir('Estás fuera de las cuatro regiones del tablero. Elige un distrito en la ubicación.'); return; }
        ponerZona(m.d); decir('Listo: te ubiqué en <b>' + esc(m.d[1]) + '</b> (' + esc(m.d[2]) + ').');
      }).catch(function (e) { btn.disabled = false; decir(esc(e.message)); });
  }
  function decir(html) {
    // el tercer dato es el tiempo en pantalla, en milisegundos
    if (window.__tbGotitaDecir) window.__tbGotitaDecir(html, [{ t: 'Entendido', prim: true, f: function () {} }], 15000);
  }

  /* ---------- Inicio ---------- */
  // Tablas de pronóstico diario que trae el tablero (las que tienen fecha, cielo y tmax), leídas de sus datos: así una
  // región nueva con su propia tabla funciona sin tocar este archivo.
  var TPRON = null;
  function tablasPron() {
    if (TPRON) return TPRON;
    TPRON = [];
    [].forEach.call(document.scripts, function (sc) {
      var t = sc.textContent || ''; if (t.indexOf('var DATA') < 0) return;
      var re = /"([a-z_0-9]+)"\s*:\s*\{\s*"c"\s*:\s*\[([^\]]*)\]/g, m;
      while ((m = re.exec(t))) { var c = m[2]; if (/"fecha"/.test(c) && /"tmax"/.test(c) && /"cielo"/.test(c)) TPRON.push({ id: m[1], est: /"estacion"/.test(c) }); }
    });
    return TPRON;
  }
  function pronHoy() {   // como el tablero: Piura con su tabla propia; las demás, la tabla que tenga su estación
    var e = ESTZ ? ESTZ.e : 'Piura', R = [], T = tablasPron(), i;
    if (e === 'Piura') R = filas('pronostico');
    for (i = 0; i < T.length && !R.length; i++) if (T[i].est) R = filas(T[i].id).filter(function (r) { return r.estacion === e; });
    if (!R.length) { var id = sinTilde(e).replace(/\s+/g, '_'); for (i = 0; i < T.length; i++) if (T[i].id === id) R = filas(id); }
    if (!R.length) { R = filas('pronostico'); e = 'Piura'; }
    var h = hoyLima();
    return { lugar: e, R: R.filter(function (r) { return String(r.fecha).slice(0, 10) >= h; }) };
  }
  function pintarInicio() {
    ponerParlante();
    var c = $('#sh-c-hoy'); if (!c) return;
    var P0 = pronHoy(), R = P0.R, h = R[0];
    if (!h) { c.innerHTML = '<h3>Pronóstico de hoy</h3><p class="sh-fuente">El pronóstico se está actualizando.</p>'; return; }
    var lo = 16, hi = 38, pmin = Math.max(0, Math.min(100, (h.tmin - lo) / (hi - lo) * 100)), pmax = Math.max(0, Math.min(100, (h.tmax - lo) / (hi - lo) * 100));
    var dias = R.slice(1, 4).map(function (r) {
      return '<div class="sh-dia"><b>' + dia(r.fecha) + '</b>' + icCielo(r.cielo) + '<small>' + esc(r.cielo) + '</small><strong>' + r0(r.tmax) + '° <span style="color:#44546A;font-weight:600">/ '
        + r0(r.tmin) + '°</span></strong><em>' + ic('gota', 12, '#0369A1', 2.4).replace('<svg', '<svg style="display:inline;vertical-align:-1px"') + ' ' + r0(r.prob_lluvia) + ' %</em></div>';
    }).join('');
    c.innerHTML = '<div class="sh-cab"><h3>Pronóstico de hoy · ' + esc(P0.lugar) + '</h3><span class="sh-chip">' + dia(h.fecha) + '</span></div>'
      + '<div class="sh-hoy"><span class="sh-hoy-ic">' + icCielo(h.cielo, 34) + '</span><span><b>' + esc(h.cielo) + '</b><span>Lluvia de ' + num(h.lluvia_mm, 1) + ' mm · probabilidad de ' + r0(h.prob_lluvia) + ' %</span></span></div>'
      + '<div class="sh-rango"><div class="sh-rango-l"><span style="color:#0369A1">Mín. ' + r0(h.tmin) + '°</span><span style="color:#C2410C">Máx. ' + r0(h.tmax) + '°</span></div>'
      + '<div class="sh-rango-b" aria-hidden="true"><i style="left:' + pmin.toFixed(1) + '%;border:4px solid #0369A1"></i><i style="left:' + pmax.toFixed(1) + '%;border:4px solid #C2410C"></i></div>'
      + '<div class="sh-rango-e"><span>' + lo + '°</span><span>' + hi + '°</span></div></div>'
      + (dias ? '<div class="sh-sep"></div><div class="sh-cab"><h3>Próximos días</h3><button type="button" class="sh-link" data-ir="pron">Ver 10 días' + ic('der', 16) + '</button></div><div class="sh-dias">' + dias + '</div>' : '');
    // río Piura (o el primero que tenga dato)
    var rc = $('#sh-c-rio'), Q = filas('caudales'), q = Q.filter(function (x) { return /Sánchez Cerro/.test(x.estacion); })[0] || Q[0];
    if (rc) {
      if (!q) rc.hidden = true;
      else {
        var med = q.qm != null ? q.qm : q.q07, nivel = String(q.nivel || ''), sin = !nivel || /normal/i.test(nivel);
        rc.innerHTML = '<span class="sh-rio-ic">' + ic('rio', 24, '#0E7490') + '</span><span><small>RÍO ' + esc(String(q.rio || '').toUpperCase()) + ' · ' + esc(String(q.clave || q.estacion).toUpperCase()) + '</small>'
          + '<span><b>' + r0(med) + ' m³/s</b> · ' + (sin ? 'sin alerta' : 'nivel ' + esc(nivel.toLowerCase())) + (q.pron_max ? ' · pico previsto de ' + r0(q.pron_max) + ' m³/s el ' + dia(q.pron_fecha) : '') + '</span></span>';
      }
    }
  }
  var ZT = {}, GH = null, pGH = null;
  function horaLima() { return new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 13) + ':00'; }
  function horaDe(iso) { try { return new Date(iso).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return ''; } }
  function pronGH() {
    if (GH && Date.now() - GH.leido < 15 * 60e3) return Promise.resolve(GH);
    if (!pGH) pGH = fetch(PRON_GH).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('GitHub ' + r.status)); })
      .then(function (j) { if (!j || !j.distritos || (j.columnas || []).indexOf('temp_c') < 0) throw new Error('sin temperatura'); j.leido = Date.now(); GH = j; pGH = null; return j; })
      .catch(function (e) { pGH = null; throw e; });
    return pGH;
  }
  function filasGH(j, u) {   // filas del distrito desde la hora actual de Lima
    var F = j.distritos[u] || [], h = horaLima(), k = -1;
    for (var i = 0; i < F.length; i++) if (F[i][0] === h) { k = i; break; }
    return k < 0 ? [] : F.slice(k);
  }
  function tempPunto(d) {   // temperatura del modelo en la capital del distrito, 20 minutos en memoria
    var k = d[0], c = ZT[k] || LS.get('tb-sh-zt-' + k, null);
    if (c && Date.now() - c.t < 20 * 60e3) return Promise.resolve(c);
    return pronGH().then(function (j) {
      var F = filasGH(j, k), it = j.columnas.indexOf('temp_c'), is = j.columnas.indexOf('sensacion_c');
      if (!F.length || F[0][it] == null) throw new Error('sin la hora actual');
      var o = { t: Date.now(), T: F[0][it], ST: is >= 0 ? F[0][is] : null, HR: null, h: F[0][0], gen: horaDe(j.generado) }; ZT[k] = o; LS.set('tb-sh-zt-' + k, o); return o;
    }).catch(function () { return tempRelay(d); });
  }
  function tempRelay(d) {   // respaldo: un solo punto por el relay
    var k = d[0];
    return fetch(RELAY + '?latitude=' + d[4] + '&longitude=' + d[5] + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&timezone=America%2FLima')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('Open-Meteo ' + r.status)); })
      .then(function (j) { var o = { t: Date.now(), T: j.current.temperature_2m, ST: j.current.apparent_temperature, HR: j.current.relative_humidity_2m, h: j.current.time }; ZT[k] = o; LS.set('tb-sh-zt-' + k, o); return o; });
  }
  function pintarZona() {
    var c = $('#sh-c-zona'); if (!c) return;
    var z = zona();
    c.innerHTML = '<div class="sh-cab"><h3>En tu zona</h3><button type="button" class="sh-link" data-ir="calor">Mapa de calor' + ic('der', 16) + '</button></div>'
      + '<div class="sh-zona"><span class="sh-zona-t" id="sh-z-t">—</span><span><b style="font-size:15px">' + esc(z[1]) + '</b><small id="sh-z-s">' + esc(z[2] + ' · ' + z[3]) + ' · consultando…</small></span></div>';
    tempPunto(z).then(function (o) {
      var t = $('#sh-z-t'), s = $('#sh-z-s'); if (!t || zona()[0] !== z[0]) return;
      t.textContent = r0(o.T) + '°';
      s.textContent = (o.ST != null ? 'Sensación de ' + r0(o.ST) + '° · ' : '') + (o.HR != null ? 'humedad de ' + r0(o.HR) + ' % · ' : '') + 'pronóstico de Open-Meteo para las ' + String(o.h || '').slice(11, 16) + ' h';
    }).catch(function () { var s = $('#sh-z-s'); if (s) s.textContent = z[2] + ' · ' + z[3] + ' · sin conexión con el modelo ahora'; });
  }
  var ACC = [
    { id: 'radar', t: 'Radar/satélite', i: 'radar', bg: '#ECFCCB', fg: '#3F6212', f: function () { irVista('radar'); } },
    { id: 'calor', t: 'Mapa de calor', i: 'calor', bg: '#FFE4E6', fg: '#BE123C', f: function () { irVista('calor'); } },
    { id: 'rios', t: 'Ríos', i: 'rio', bg: '#CFFAFE', fg: '#0E7490', f: function () { irVista('avisos'); } },
    { id: 'graf', t: 'Gráficas', i: 'graf', bg: '#E0E7FF', fg: '#3730A3', f: function () { irVista('reg'); } },
    { id: 'nino', t: 'El Niño', i: 'nino', bg: '#FCE7F3', fg: '#BE185D', f: function () { irVista('nino'); } },
    { id: 'alertas', t: 'Mis alertas', i: 'sirena', bg: '#FFEDD5', fg: '#C2410C', f: function () { abrirAlertas(); } },
    { id: 'escuchar', t: 'Escuchar el resumen', i: 'voz', bg: '#EDE9FE', fg: '#6D28D9', f: function () { escuchar(); } },
    { id: 'instalar', t: 'Instalar la app', i: 'cel', bg: '#DCFCE7', fg: '#15803D', f: function () { instalar(); } }
  ];
  var ACC_DEF = ['radar', 'calor', 'rios', 'graf', 'nino', 'alertas'];
  function instalada() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function pintarAccesos() {
    var g = $('#sh-acc'); if (!g) return;
    var sel = LS.get('tb-sh-accesos', ACC_DEF);
    g.innerHTML = ACC.filter(function (a) { return sel.indexOf(a.id) >= 0 && !(a.id === 'instalar' && instalada()); }).map(function (a) {
      return '<button type="button" data-acc="' + a.id + '"><span class="sh-ai" style="background:' + a.bg + '">' + ic(a.i, 24, a.fg) + '</span><span>' + esc(a.t) + '</span></button>';
    }).join('');
  }
  function hojaAccesos() {
    var sel = LS.get('tb-sh-accesos', ACC_DEF);
    hoja('Personaliza tus accesos', '<p class="sh-fuente">Marca los que quieres ver en Inicio.</p>' + ACC.filter(function (a) { return !(a.id === 'instalar' && instalada()); }).map(function (a) {
      return '<label class="sh-check"><input type="checkbox" value="' + a.id + '"' + (sel.indexOf(a.id) >= 0 ? ' checked' : '') + '>' + esc(a.t) + '</label>';
    }).join('') + '<button type="button" class="sh-prim" id="sh-acc-ok">Guardar</button>', function (v) {
      v.querySelector('#sh-acc-ok').addEventListener('click', function () {
        var n = [].slice.call(v.querySelectorAll('input:checked')).map(function (i) { return i.value; });
        LS.set('tb-sh-accesos', n.length ? n : ACC_DEF); pintarAccesos(); cerrarHoja();
      });
    });
  }

  /* ---------- Gotita: menú, escuchar, alertas, instalar ---------- */
  function abrirAlertas() { cerrarHoja(); if (window.__tbAlertas) window.__tbAlertas.abrir(); else decir('Las alertas se activan con conexión a internet. Prueba en un momento.'); }
  function instalar() {
    cerrarHoja();
    if (instalada()) { decir('La app ya está instalada en este equipo.'); return; }
    if (window.__tbInstalar) window.__tbInstalar(); else decir('Abre esta página en Chrome para instalar la app.');
  }
  function fuentes() {
    cerrarHoja(); irVista('inicio');
    setTimeout(function () { var f = $('.tb-footer'); if (f) f.scrollIntoView({ behavior: REDUCIR ? 'auto' : 'smooth', block: 'start' }); }, 60);
  }
  function hojaGotita() {
    var V = vigentes(), al = window.__tbAlertas;
    var saludo = V.length ? 'Hoy hay ' + V.length + (V.length === 1 ? ' aviso vigente' : ' avisos vigentes') + ' en el norte. ¿En qué te ayudo?' : '¡Hola! ¿En qué te ayudo?';
    function op(id, i, bg, fg, t, s) {
      return '<button type="button" class="sh-op" data-g="' + id + '"><span class="sh-ai" style="background:' + bg + '">' + ic(i, 22, fg) + '</span><span><b>' + esc(t) + '</b><small>' + esc(s) + '</small></span>' + ic('der', 18, '#94A3B8') + '</button>';
    }
    hoja('Gotita', '<div class="sh-dice">' + gotitaSvg() + '<div class="sh-globo">' + esc(saludo) + '</div></div>'
      + op('escuchar', 'voz', '#E0E7FF', '#3730A3', 'Escuchar el resumen de hoy', 'Te leo el tiempo, los avisos, el río y el mar')
      + op('recorrido', 'ruta', '#FCE7F3', '#BE185D', 'Recorrer la app', '6 pasos cortos para ubicarte')
      + op('alertas', 'sirena', '#FFEDD5', '#C2410C', 'Mis alertas de lluvia', al && al.activas() ? al.etiqueta() + ' · tócalo para cambiar o probar' : 'Te aviso con sirena si viene lluvia a tu distrito')
      + (instalada() ? '' : op('instalar', 'cel', '#DCFCE7', '#15803D', 'Instalar la app', 'Queda con su ícono en tu pantalla'))
      + op('fuentes', 'info', '#E0F2FE', '#075985', 'Fuentes y autor del tablero', 'SENAMHI, ENFEN, IGP, ANA, NOAA y Open-Meteo'), function (v) {
      v.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-g]'); if (!b) return;
        var g = b.getAttribute('data-g');
        if (g === 'escuchar') { cerrarHoja(); escuchar(); }
        else if (g === 'recorrido') { cerrarHoja(); empezarTour(); }
        else if (g === 'alertas') abrirAlertas();
        else if (g === 'instalar') instalar();
        else if (g === 'fuentes') fuentes();
      });
    });
  }
  /* ---------- resumen hablado (parlante de la cabecera y menú de Gotita) ---------- */
  // Se arma con lo que muestra la cabecera, así habla siempre de la ciudad que el usuario está viendo.
  var DIRV = { N: 'norte', S: 'sur', E: 'este', O: 'oeste', W: 'oeste', NE: 'noreste', NO: 'noroeste', NW: 'noroeste', SE: 'sureste', SO: 'suroeste', SW: 'suroeste',
    NNE: 'nor-noreste', ENE: 'este-noreste', ESE: 'este-sureste', SSE: 'sur-sureste', SSO: 'sur-suroeste', SSW: 'sur-suroeste', OSO: 'oeste-suroeste', WSW: 'oeste-suroeste',
    ONO: 'oeste-noroeste', WNW: 'oeste-noroeste', NNO: 'nor-noroeste', NNW: 'nor-noroeste' };
  var NIV = { rojo: 4, naranja: 3, amarillo: 2, verde: 1 };
  function tx(s) { var e = $(s); return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function pares(s) {   // los <span>Etiqueta <b>valor</b></span> de la cabecera
    var o = {}; [].forEach.call(document.querySelectorAll(s + ' > span'), function (sp) {
      var b = sp.querySelector('b'); if (!b) return; o[sp.textContent.replace(b.textContent, '').trim().replace(/\.$/, '')] = b.textContent.trim();
    }); return o;
  }
  function vozNum(v) { return String(v).replace(/[°\s]+$/, '').replace(/°C?/g, '').trim(); }
  function lugarCab() { return tx('#tb-now .tb-now-lugar') || 'Piura'; }
  function resumenCabecera() {
    var lugar = lugarCab(), t = [], z = zona();
    if (zonaElegida() && ESTZ && ESTZ.e === lugar && sinTilde(z[1]) !== sinTilde(lugar)) t.push('Estás en ' + z[1] + '. La estación más cercana es ' + lugar + '.');
    else t.push('El tiempo en ' + lugar + '.');
    var T = vozNum(tx('#now-t')), cielo = tx('#now-cielo').toLowerCase(), src = tx('#now-src');
    if (T && T !== '—') {
      var m = /^Medido\s+(\d{1,2}:\d{2})/.exec(src);
      t.push((m ? 'Medido a las ' + m[1] + ': ' : 'Ahora, según el pronóstico: ') + T + ' grados' + (cielo ? ', ' + cielo : '') + '.');
    }
    var h = pares('#now-hoy'), hoy = [];
    if (h['Máx'] && h['Mín']) hoy.push('máxima de ' + vozNum(h['Máx']) + ' y mínima de ' + vozNum(h['Mín']) + ' grados');
    else if (h['Máx']) hoy.push('máxima de ' + vozNum(h['Máx']) + ' grados');
    if (h.Lluvia) {
      var ll = h.Lluvia.split('·'), pr = vozNum(ll[0]).replace(/\s*%$/, '');
      hoy.push(pr + ' por ciento de probabilidad de lluvia' + (ll[1] ? ', unos ' + ll[1].replace(/\s*mm/, '').trim() + ' milímetros' : ''));
    }
    if (hoy.length) t.push('Hoy, ' + hoy.join('; ') + '.');
    var d = pares('#now-dat'), dd = [];
    if (d.Humedad) dd.push('humedad de ' + d.Humedad.replace(/\s*%$/, '') + ' por ciento');
    if (d.Viento) {
      if (/calma/i.test(d.Viento)) dd.push('viento en calma');
      else { var w = /^([A-Z]{1,3})?\s*(\d+)/.exec(d.Viento); if (w) dd.push('viento' + (w[1] && DIRV[w[1]] ? ' del ' + DIRV[w[1]] : '') + ' a ' + w[2] + ' kilómetros por hora'); }
    }
    if (d['Ráfagas']) dd.push('ráfagas de ' + d['Ráfagas'].replace(/\s*km\/h/, '') + ' kilómetros por hora');
    if (dd.length) t.push(dd[0].charAt(0).toUpperCase() + dd.join(', ').slice(1) + '.');
    var V = vigentes(), top = null;   // el mismo aviso que muestra la cabecera: el del SENAMHI de nivel más alto
    V.forEach(function (a) { if (a.emisor === 'SENAMHI' && (NIV[String(a.nivel || '').toLowerCase()] || 0) > (top ? NIV[String(top.nivel).toLowerCase()] || 0 : 0)) top = a; });
    if (top) {
      var pel = String(top.peligro || top.documento || '').replace(/;.*$/, '').replace(/N\.?\s*°\s*/g, 'número ').trim();
      t.push('Aviso del SENAMHI de nivel ' + String(top.nivel).toLowerCase() + (pel ? ': ' + pel.charAt(0).toLowerCase() + pel.slice(1) : '') + '.');
    }
    if (V.length > 1 || (V.length === 1 && !top)) t.push('En total hay ' + (V.length === 1 ? 'un aviso vigente' : V.length + ' avisos vigentes') + '; los ves en la campana.');
    else if (!V.length) t.push('No hay avisos vigentes.');
    return t.join(' ');
  }
  function resumen() {   // el del menú de Gotita: lo de la cabecera, más el río y el mar
    var t = [resumenCabecera()], b = $('#reg-tiempo button[aria-pressed="true"]'), reg = b ? b.getAttribute('data-v') : 'piura';
    var Q = filas('caudales'), q = Q.filter(function (x) { return /Sánchez Cerro/.test(x.estacion); })[0];
    var N = filas('nino_semanal'), n = N[N.length - 1];
    if (reg === 'piura' && q) t.push('El río Piura en Sánchez Cerro lleva ' + r0(q.qm != null ? q.qm : q.q07) + ' metros cúbicos por segundo.');
    if (n && n.anom_nino12 != null) t.push('El mar en la región Niño uno más dos está ' + num(n.anom_nino12, 1) + ' grados sobre lo normal.');
    return t.join(' ');
  }
  var VOCES = [];
  function cargarVoces() { try { VOCES = speechSynthesis.getVoices() || []; } catch (e) {} }
  if ('speechSynthesis' in window) { cargarVoces(); try { speechSynthesis.addEventListener('voiceschanged', cargarVoces); } catch (e) {} }
  var HABLA = null;   // { btn, fin }
  function callar() { if (HABLA) { var h = HABLA; HABLA = null; try { speechSynthesis.cancel(); } catch (e) {} h.fin(); } }
  function hablar(texto, btn) {
    callar();
    if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) { decir(esc(texto)); return false; }
    try {
      if (!VOCES.length) cargarVoces();
      var voz = VOCES.filter(function (x) { return /^es[-_](PE|419|US|MX|CO|CL|AR)/i.test(x.lang); })[0] || VOCES.filter(function (x) { return /^es/i.test(x.lang); })[0];
      var g = $('#tb-guia'), yo = {};
      yo.btn = btn; yo.fin = function () {
        if (g) g.classList.remove('gx-habla');
        if (btn) { btn.classList.remove('sh-hablando'); btn.setAttribute('aria-pressed', 'false'); }
      };
      HABLA = yo; if (g) g.classList.add('gx-habla');
      if (btn) { btn.classList.add('sh-hablando'); btn.setAttribute('aria-pressed', 'true'); }
      // por frases: Chrome corta las lecturas largas
      var F = texto.match(/[^.!?]+[.!?]*/g) || [texto];
      F.forEach(function (fr, k) {
        var u = new SpeechSynthesisUtterance(fr.trim());
        u.lang = voz ? voz.lang : 'es-PE'; if (voz) u.voice = voz; u.rate = 0.95;
        if (k === F.length - 1) u.onend = function () { if (HABLA === yo) { HABLA = null; yo.fin(); } };
        u.onerror = function (ev) { if (HABLA === yo && ev.error !== 'interrupted' && ev.error !== 'canceled') { HABLA = null; yo.fin(); } };
        speechSynthesis.speak(u);
      });
      return true;
    } catch (e) { callar(); decir(esc(texto)); return false; }
  }
  function escuchar() { var txt = resumen(); if (hablar(txt, null)) decir(esc(txt)); }
  function ponerParlante() {
    var top = $('#tb-now .tb-now-top'); if (!top) return;
    var b = $('#sh-parla');
    if (!b) {
      b = el('button', { type: 'button', 'class': 'sh-parla', id: 'sh-parla', 'aria-pressed': 'false' },
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path class="sh-onda" d="M15.5 9a4 4 0 0 1 0 6"/><path class="sh-onda sh-onda2" d="M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>');
      var lu = top.querySelector('.tb-now-lugar');
      top.insertBefore(b, lu ? lu.nextSibling : top.firstChild);
      if (lu && window.MutationObserver) try { new MutationObserver(function () { ponerParlante(); }).observe(lu, { childList: true, characterData: true, subtree: true }); } catch (e) {}
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (HABLA && HABLA.btn === b) { callar(); return; }
        hablar(resumenCabecera(), b);
      });
    }
    var l = 'Escuchar el resumen de ' + lugarCab();
    if (b.getAttribute('aria-label') !== l) { b.setAttribute('aria-label', l); b.title = l; }
  }

  /* ---------- mis alertas (en Avisos) ---------- */
  function pintarMis() {
    var c = $('#sh-mis'); if (!c) return;
    var al = window.__tbAlertas, on = al && al.activas();
    c.innerHTML = '<h3>Mis alertas de Gotita</h3><div class="sh-fila">' + gotitaSvg() + '<p>' + (on ? 'Te aviso con sirena cuando venga lluvia. <b>' + esc(al.etiqueta()) + '</b>.'
      : 'Puedo avisarte, con sirena, cuando venga lluvia a tu distrito. Funciona aunque la app esté cerrada.') + '</p></div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="sh-prim" data-al="1">' + (on ? 'Cambiar o probar' : 'Activar mis alertas') + '</button></div>';
  }

  /* ---------- recorrido ---------- */
  var TOURA = null;
  var PASOS = [
    { s: '#sh-lugar', v: 'inicio', t: 'Tu ubicación', p: 'Toca aquí para elegir tu distrito. El botón de al lado te ubica donde estás. El mapa de calor y la tarjeta «En tu zona» usan este lugar.' },
    { s: '#sh-campana', v: 'inicio', t: 'Avisos y ríos', p: 'La campana cuenta los avisos vigentes y se pone roja si hay uno importante. Tócala para ver los avisos, los ríos y tus alertas.' },
    { s: '#tb-now', v: 'inicio', t: 'El tiempo ahora', p: 'El tiempo en la estación más cercana a ti. Toca el parlante y te leo el resumen. Debajo están las demás estaciones: toca una para cambiar.' },
    { s: '#sh-c-hoy', v: 'inicio', t: 'Pronóstico de hoy', p: 'El cielo, la lluvia y la mínima y máxima de hoy, con los tres días que vienen.' },
    { s: '.sh-nav', v: 'inicio', t: 'Las cinco secciones', p: 'Inicio, Pronóstico, Radar/satélite, Mapa de calor y El Niño, siempre a un toque desde abajo.' },
    { s: '#tb-g-ava', v: 'inicio', t: 'Gotita', p: 'Tócame cuando quieras: te leo el resumen, activo tus alertas de lluvia o te ayudo a instalar la app.', fin: true }
  ];
  function empezarTour() { terminarTour(); TOURA = { i: 0 }; H.classList.add('sh-en-tour'); irVista('inicio'); setTimeout(mostrarPaso, 120); }
  function terminarTour() {
    if (!TOURA) return; TOURA = null; LS.set(TOUR, 1); H.classList.remove('sh-en-tour');
    ['.sh-tour', '.sh-tour-foco'].forEach(function (s) { var x = $(s); if (x) x.remove(); });
  }
  function mostrarPaso() {
    if (!TOURA) return;
    var p = PASOS[TOURA.i], t = $(p.s);
    if (!t || !t.getClientRects().length) { if (TOURA.i < PASOS.length - 1) { TOURA.i++; return mostrarPaso(); } return terminarTour(); }
    if (p.s !== '.sh-nav' && p.s !== '#tb-g-ava') t.scrollIntoView({ block: 'center', behavior: 'auto' });
    setTimeout(function () {
      if (!TOURA) return;
      var r = t.getBoundingClientRect(), f = $('.sh-tour-foco') || document.body.appendChild(el('div', { 'class': 'sh-tour-foco', 'aria-hidden': 'true' }));
      f.style.left = (r.left - 6) + 'px'; f.style.top = (r.top - 6) + 'px'; f.style.width = (r.width + 12) + 'px'; f.style.height = (r.height + 12) + 'px';
      var b = $('.sh-tour'); if (b) b.remove();
      var al = window.__tbAlertas, ofrecer = p.fin && al && !al.activas();
      b = el('div', { 'class': 'sh-tour', role: 'dialog', 'aria-label': 'Recorrido, paso ' + (TOURA.i + 1) + ' de ' + PASOS.length },
        '<span class="sh-chip">' + (TOURA.i + 1) + ' de ' + PASOS.length + '</span><h4>' + esc(p.t) + '</h4><p>' + esc(p.p) + (ofrecer ? ' ¿Te aviso cuando venga lluvia a tu distrito?' : '') + '</p>'
        + '<div class="sh-tour-acc">' + (p.fin ? '' : '<button type="button" class="sh-saltar" data-t="saltar">Saltar</button>')
        + (TOURA.i ? '<button type="button" data-t="atras">Atrás</button>' : '')
        + (ofrecer ? '<button type="button" data-t="fin">Ahora no</button><button type="button" class="sh-sig" data-t="alertas">Sí, avísame</button>'
          : '<button type="button" class="sh-sig" data-t="' + (p.fin ? 'fin' : 'sig') + '">' + (p.fin ? 'Entendido' : 'Siguiente') + '</button>') + '</div>');
      document.body.appendChild(b);
      var alto = b.offsetHeight, vh = window.innerHeight;
      var abajo = r.bottom + 14 + alto < vh - 8;
      b.style.top = (abajo ? r.bottom + 14 : Math.max(8, r.top - 14 - alto)) + 'px';
      b.addEventListener('click', function (ev) {
        var x = ev.target.closest('[data-t]'); if (!x) return;
        var a = x.getAttribute('data-t');
        if (a === 'sig') { TOURA.i++; mostrarPaso(); }
        else if (a === 'atras') { TOURA.i = Math.max(0, TOURA.i - 1); mostrarPaso(); }
        else if (a === 'alertas') { terminarTour(); abrirAlertas(); }
        else terminarTour();
      });
      var s = b.querySelector('.sh-sig'); if (s) s.focus();
    }, 220);
  }
  window.addEventListener('resize', function () { if (TOURA) mostrarPaso(); });

  /* ---------- mapa de calor ---------- */
  var CAL = { mapa: null, datos: null, h: 0, capa: null, etq: null, yo: null, cache: {}, D: null, base: null };
  var pLeaf = null;
  function leaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (pLeaf) return pLeaf;
    pLeaf = new Promise(function (ok, mal) {
      var l = el('link', { rel: 'stylesheet', href: 'leaflet.css' }); document.head.appendChild(l);
      var s = el('script', { src: 'leaflet.js' }); s.onload = function () { ok(); }; s.onerror = function () { pLeaf = null; mal(new Error('Sin conexión: el mapa se abre cuando vuelva la señal.')); };
      document.head.appendChild(s);
    });
    return pLeaf;
  }
  function datosCalor(D) {
    var c = CAL.datos || LS.get('tb-sh-calor', null);
    if (c && c.n === D.length && Date.now() - c.t < 25 * 60e3 && c.horas && c.horas[0] === horaLima()) return Promise.resolve(c);
    return pronGH().then(function (j) {
      var it = j.columnas.indexOf('temp_c'), is = j.columnas.indexOf('sensacion_c'), horas = [], con = 0;
      var T = D.map(function (d) {
        var F = filasGH(j, d[0]).slice(0, 13); if (F.length) { con++; if (!horas.length) horas = F.map(function (f) { return f[0]; }); }
        return F.map(function (f) { return f[it]; });
      });
      if (con < D.length * 0.8) throw new Error('incompleto');
      var o = { t: Date.now(), n: D.length, fuente: 'gh', consulta: horaDe(j.generado), horas: horas, T: T,
        ahora: D.map(function (d, i) { var F = filasGH(j, d[0]); return F.length ? [F[0][it], is >= 0 ? F[0][is] : null, null] : [null, null, null]; }) };
      LS.set('tb-sh-calor', o);
      return o;
    }).catch(function () { return calorRelay(D); });
  }
  function calorRelay(D) {   // respaldo si el archivo de GitHub aún no trae la temperatura: un pedido por el relay, guardado 25 minutos
    var url = RELAY + '?latitude=' + D.map(function (d) { return d[4]; }).join(',') + '&longitude=' + D.map(function (d) { return d[5]; }).join(',')
      + '&current=temperature_2m,apparent_temperature,relative_humidity_2m&hourly=temperature_2m&forecast_hours=13&timezone=America%2FLima';
    return fetch(url).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('El modelo no respondió (' + r.status + '). Prueba en un momento.')); })
      .then(function (j) {
        var a = Array.isArray(j) ? j : [j];
        if (a.length !== D.length) throw new Error('El modelo devolvió datos incompletos. Prueba en un momento.');
        var o = { t: Date.now(), n: D.length, fuente: 'relay', consulta: String(a[0].current && a[0].current.time || '').slice(11, 16), horas: (a[0].hourly && a[0].hourly.time) || [],
          ahora: a.map(function (x) { var k = x.current || {}; return [k.temperature_2m, k.apparent_temperature, k.relative_humidity_2m]; }),
          T: a.map(function (x) { return (x.hourly && x.hourly.temperature_2m) || []; }) };
        LS.set('tb-sh-calor', o);
        return o;
      });
  }
  function valores() { var d = CAL.datos; return CAL.h === 0 ? d.ahora.map(function (x) { return x[0]; }) : d.T.map(function (x) { return x[CAL.h]; }); }
  var RAMPA = [[14, [37, 99, 235]], [18, [6, 182, 212]], [22, [34, 197, 94]], [26, [234, 179, 8]], [30, [249, 115, 22]], [34, [220, 38, 38]], [38, [162, 28, 175]]];
  function color(t) {
    if (t <= RAMPA[0][0]) return RAMPA[0][1];
    for (var i = 1; i < RAMPA.length; i++) if (t <= RAMPA[i][0]) {
      var a = RAMPA[i - 1], b = RAMPA[i], f = (t - a[0]) / (b[0] - a[0]);
      return [a[1][0] + (b[1][0] - a[1][0]) * f, a[1][1] + (b[1][1] - a[1][1]) * f, a[1][2] + (b[1][2] - a[1][2]) * f];
    }
    return RAMPA[RAMPA.length - 1][1];
  }
  var MASCARA = 0.32, CERCA = 0.2;   // grados: más allá de unos 35 km de una capital de distrito no se pinta
  function idw(la, lo, D, V) {
    var sw = 0, st = 0, d2min = 99, imin = -1, cl = Math.cos(la * Math.PI / 180);
    for (var i = 0; i < D.length; i++) {
      var v = V[i]; if (v == null) continue;
      var dy = la - D[i][4], dx = (lo - D[i][5]) * cl, d2 = dx * dx + dy * dy;
      if (d2 < d2min) { d2min = d2; imin = i; }
      if (d2 > 0.36) continue;
      var w = 1 / Math.max(d2, 1e-5); sw += w; st += w * v;
    }
    return { t: sw ? st / sw : null, d: Math.sqrt(d2min), i: imin };
  }
  function limites(D) {
    var a = [90, -90, 180, -180]; D.forEach(function (d) { a[0] = Math.min(a[0], d[4]); a[1] = Math.max(a[1], d[4]); a[2] = Math.min(a[2], d[5]); a[3] = Math.max(a[3], d[5]); });
    return [[a[0] - 0.3, a[2] - 0.3], [a[1] + 0.3, a[3] + 0.3]];
  }
  function raster(D, V) {
    var b = limites(D), s = b[0][0], n = b[1][0], o = b[0][1], e = b[1][1];
    var filasN = 300, colsN = Math.round(filasN * (e - o) * Math.cos((s + n) / 2 * Math.PI / 180) / (n - s));
    var cv = document.createElement('canvas'); cv.width = colsN; cv.height = filasN;
    var cx = cv.getContext('2d'), img = cx.createImageData(colsN, filasN), px = img.data;
    for (var y = 0; y < filasN; y++) {
      var la = n - (y + 0.5) / filasN * (n - s);
      for (var x = 0; x < colsN; x++) {
        var lo = o + (x + 0.5) / colsN * (e - o), r = idw(la, lo, D, V), k = (y * colsN + x) * 4;
        if (r.t == null || r.d > MASCARA) { px[k + 3] = 0; continue; }
        var c = color(r.t), al = r.d < CERCA ? 1 : (MASCARA - r.d) / (MASCARA - CERCA);
        px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; px[k + 3] = Math.round(235 * al);
      }
    }
    cx.putImageData(img, 0, 0);
    return { url: cv.toDataURL('image/png'), b: b };
  }
  function pintarCapa() {
    var D = CAL.D, V = valores(), k = CAL.h;
    var R = CAL.cache[k] || (CAL.cache[k] = raster(D, V));
    if (CAL.capa) CAL.mapa.removeLayer(CAL.capa);
    CAL.capa = L.imageOverlay(R.url, R.b, { opacity: 0.58, interactive: false, className: 'sh-capa' }).addTo(CAL.mapa);
    if (CAL.etq) CAL.mapa.removeLayer(CAL.etq);
    CAL.etq = L.layerGroup(D.map(function (d, i) {
      return L.marker([d[4], d[5]], { interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: null, html: '<span class="sh-tl">' + r0(V[i]) + '°</span>' }) });
    }));
    etiquetas();
    lecturaZona();
  }
  function etiquetas() { if (!CAL.etq) return; if (CAL.mapa.getZoom() >= 9) CAL.etq.addTo(CAL.mapa); else CAL.mapa.removeLayer(CAL.etq); }
  function horaTxt(k) { var h = CAL.datos && CAL.datos.horas[k]; return h ? h.slice(11, 16) : ''; }
  function lecturaZona() {
    var z = zona(), out = $('#sh-cal-zona'); if (!out || !CAL.datos) return;
    var i = -1; CAL.D.forEach(function (d, j) { if (d[0] === z[0]) i = j; });
    if (i < 0) { out.textContent = ''; return; }
    var a = CAL.datos.ahora[i], t = CAL.h === 0 ? a[0] : CAL.datos.T[i][CAL.h];
    out.innerHTML = '<b>' + esc(z[1]) + '</b> (' + esc(z[2]) + '): <b style="color:#BE123C">' + r0(t) + ' °C</b> ' + (CAL.h === 0
      ? 'ahora' + (a[1] != null ? ' · sensación de ' + r0(a[1]) + ' °C' : '') + (a[2] != null ? ' · humedad de ' + r0(a[2]) + ' %' : '') : 'a las ' + horaTxt(CAL.h));
  }
  function popTemp(la, lo, titulo) {
    var r = idw(la, lo, CAL.D, valores());
    if (r.t == null || r.d > MASCARA) return '<div class="sh-pop">' + (titulo ? '<b style="font-size:14px">' + esc(titulo) + '</b><br>' : '') + 'Fuera de la zona del mapa: Tumbes, Piura, Lambayeque y La Libertad.</div>';
    var d = CAL.D[r.i];
    return '<div class="sh-pop">' + (titulo ? '<b style="font-size:14px">' + esc(titulo) + '</b><br>' : '') + '<b>≈ ' + r0(r.t) + ' °C</b> ' + (CAL.h === 0 ? 'ahora' : 'a las ' + horaTxt(CAL.h))
      + '<br>Cerca de ' + esc(d[1]) + ' (' + esc(d[2]) + ')</div>';
  }
  function base() {
    var K = self.TB_GOOGLE_MAPS;
    var carto = function () {   // OpenStreetMap; si sus servidores fallan, el estilo humanitario de OSM Francia
      var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' });
      var fallas = 0, cargadas = 0;
      osm.on('tileload', function () { cargadas++; });
      osm.on('tileerror', function () {
        if (++fallas < 6 || cargadas > 4 || !CAL.mapa || !CAL.mapa.hasLayer(osm)) return;
        CAL.mapa.removeLayer(osm);
        CAL.base = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { subdomains: 'abc', maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, OSM France' }).addTo(CAL.mapa);
      });
      return osm;
    };
    if (!K) return Promise.resolve(carto());
    // Mapa de Google (Map Tiles API): se activa al poner la clave en config.js (self.TB_GOOGLE_MAPS)
    var c = LS.get('tb-sh-gses', null);
    var p = c && c.k === K && c.exp * 1000 > Date.now() + 864e5 ? Promise.resolve(c)
      : fetch('https://tile.googleapis.com/v1/createSession?key=' + encodeURIComponent(K), { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapType: 'roadmap', language: 'es-419', region: 'PE' }) })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('Google ' + r.status)); })
        .then(function (j) { var o = { s: j.session, exp: +j.expiry, k: K }; LS.set('tb-sh-gses', o); return o; });
    return p.then(function (o) {
      return L.tileLayer('https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=' + encodeURIComponent(o.s) + '&key=' + encodeURIComponent(K), { maxZoom: 20, attribution: 'Mapa &copy; Google' });
    }).catch(function () { return carto(); });
  }
  function ubicarEnMapa(auto) {
    var msg = $('#sh-cal-msg');
    if (!auto && msg) msg.textContent = 'Buscando dónde estás…';
    ubicarme().then(function (c) {
      var ll = [c.latitude, c.longitude];
      if (CAL.yo) CAL.mapa.removeLayer(CAL.yo);
      CAL.yo = L.layerGroup([
        L.circle(ll, { radius: Math.min(c.accuracy || 0, 3000), color: '#2563EB', weight: 1, fillOpacity: 0.08, interactive: false }),
        L.marker(ll, { icon: L.divIcon({ className: '', iconSize: [18, 18], html: '<div class="sh-yo"></div>' }), title: 'Estás aquí', alt: 'Estás aquí' })
      ]).addTo(CAL.mapa);
      CAL.mapa.setView(ll, Math.max(CAL.mapa.getZoom(), 10));
      var m = masCercano(CAL.D, ll[0], ll[1]), nueva = false;
      if (m.d && m.km < 80 && !zonaElegida()) { ponerZona(m.d); nueva = true; }   // sin zona elegida: queda la de su ubicación
      var html = popTemp(ll[0], ll[1], 'Estás aquí') + (nueva ? '<div class="sh-pop">Tu zona ahora es <b>' + esc(m.d[1]) + '</b>: el tablero muestra su región y su estación más cercana.</div>'
        : m.d && m.km < 80 && m.d[0] !== zona()[0] ? '<button type="button" class="sh-link" id="sh-usar-zona">Usar ' + esc(m.d[1]) + ' como mi zona</button>' : '');
      L.popup({ maxWidth: 260 }).setLatLng(ll).setContent(html).openOn(CAL.mapa);
      setTimeout(function () { var u = $('#sh-usar-zona'); if (u) u.addEventListener('click', function () { ponerZona(m.d); CAL.mapa.closePopup(); }); }, 30);
      if (msg) msg.textContent = '';
    }).catch(function (e) { if (!auto && msg) msg.textContent = e.message; });
  }
  function abrirCalor() {
    var caja = $('#sh-mapa-msg');
    if (CAL.mapa) { setTimeout(function () { CAL.mapa.invalidateSize(); }, 50); return; }
    caja.hidden = false; caja.textContent = 'Cargando el mapa y la temperatura de los distritos…';
    Promise.all([leaflet(), distritos()]).then(function (r) {
      var D = CAL.D = r[1];
      return datosCalor(D).then(function (dat) {
        CAL.datos = dat;
        var z = zona();
        CAL.mapa = L.map('sh-mapa', { zoomControl: true, preferCanvas: true, attributionControl: true }).setView([z[4], z[5]], 9);
        CAL.mapa.attributionControl.setPrefix(false);
        CAL.mapa.attributionControl.addAttribution('Temperatura: <a href="https://open-meteo.com/">Open-Meteo</a>');
        base().then(function (t) { CAL.base = t.addTo(CAL.mapa); });
        CAL.mapa.on('zoomend', etiquetas);
        CAL.mapa.on('click', function (ev) { L.popup({ maxWidth: 240 }).setLatLng(ev.latlng).setContent(popTemp(ev.latlng.lat, ev.latlng.lng)).openOn(CAL.mapa); });
        pintarHoras(); pintarCapa();
        var f = $('#sh-cal-fuente');
        if (f) f.textContent = 'Pronóstico por hora de Open-Meteo en las capitales de ' + D.length + ' distritos de Tumbes, Piura, Lambayeque y La Libertad, interpolado entre ellas'
          + (dat.fuente === 'gh' ? ' (se renueva cada media hora; esta versión es de las ' + dat.consulta + ' h).' : ' (consultado a las ' + dat.consulta + ' h).')
          + ' Es una guía del modelo: lo medido está en las estaciones.';
        caja.hidden = true;
        if (!LS.get('tb-sh-ubico', 0)) { LS.set('tb-sh-ubico', 1); ubicarEnMapa(true); }
        else if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then(function (s) { if (s.state === 'granted') ubicarEnMapa(true); }).catch(function () {});
      });
    }).catch(function (e) {
      caja.hidden = false; caja.innerHTML = esc(e && e.message || 'No se pudo abrir el mapa.') + '<br><button type="button" class="sh-sec2" id="sh-cal-otra" style="margin-top:12px">Intentar otra vez</button>';
      var b = $('#sh-cal-otra'); if (b) b.addEventListener('click', function () { if (CAL.mapa) { CAL.mapa.remove(); CAL.mapa = null; } abrirCalor(); });
    });
  }
  function pintarHoras() {
    var c = $('#sh-cal-horas'); if (!c || !CAL.datos) return;
    var hs = [0, 3, 6, 9, 12].filter(function (k) { return k === 0 || CAL.datos.horas[k]; });
    c.innerHTML = hs.map(function (k) { return '<button type="button" data-h="' + k + '" aria-pressed="' + (k === CAL.h) + '">' + (k ? horaTxt(k) + ' h' : 'Ahora') + '</button>'; }).join('');
  }

  /* ---------- armar la página ---------- */
  function armar() {
    var tb = $('#tb'), cab = $('#tb .tb-cab'), tabs = $('#tb .tb-tabs');
    if (!tb || !cab || !tabs) { H.classList.remove('sh'); return; }   // otra versión del tablero: se deja como está
    var top = el('div', { 'class': 'sh-top' },
      '<button type="button" class="sh-lugar" id="sh-lugar">' + ic('pin', 22, '#FDE68A') + '<span class="sh-lugar-t"><small>UBICACIÓN</small><b></b></span>' + ic('abajo', 20, '#C7D2FE') + '</button>'
      + '<button type="button" class="sh-btn" id="sh-gps" aria-label="Ubicarme en mi distrito">' + ic('gps', 22, '#fff') + '</button>'
      + '<button type="button" class="sh-btn sh-campana" id="sh-campana">' + ic('campana', 22, '#fff') + '<span class="sh-badge" hidden></span></button>');
    var tit = el('div', { 'class': 'sh-titulo' }, '<h2></h2><p></p>');
    var hdr = cab.querySelector('.tb-top');
    cab.insertBefore(top, hdr || cab.firstChild); cab.insertBefore(tit, top.nextSibling);
    var ini = el('section', { id: 'sh-inicio', 'class': 'sh-sec', 'aria-label': 'Inicio' },
      '<div class="sh-card" id="sh-c-hoy"></div>'
      + '<div class="sh-card"><div id="sh-c-zona"></div><button type="button" class="sh-rio" id="sh-c-rio" data-ir="avisos"></button></div>'
      + '<div class="sh-card" style="grid-column:1/-1"><div class="sh-cab"><h3>Acceso rápido</h3><button type="button" class="sh-pers" id="sh-pers">' + ic('lapiz', 15, '#3730A3') + 'Personalizar</button></div><div class="sh-acc" id="sh-acc"></div></div>');
    tb.insertBefore(ini, tabs);
    var seg = el('div', { 'class': 'sh-seg', id: 'sh-seg-pron', role: 'group', 'aria-label': 'Pronóstico o registro' },
      '<button type="button" data-v="pron">Pronóstico</button><button type="button" data-v="reg">Registro (gráficas)</button>');
    var pt = $('#tiempo'); if (pt) tb.insertBefore(seg, pt);
    var cal = el('section', { id: 'sh-calor', 'aria-label': 'Mapa de calor' },
      '<div class="sh-horas" id="sh-cal-horas" role="group" aria-label="Hora"></div>'
      + '<div class="sh-mapa-caja"><div id="sh-mapa" role="region" aria-label="Mapa de calor de la temperatura"></div><div class="sh-mapa-msg" id="sh-mapa-msg" role="status">Cargando…</div>'
      + '<button type="button" class="sh-yo-btn" id="sh-cal-yo" aria-label="Ubicarme en el mapa">' + ic('gps', 24, '#12146A') + '</button>'
      + '<div class="sh-leyenda" aria-hidden="true"><div class="sh-leyenda-b"></div><div class="sh-leyenda-e"><span>14°</span><span>18°</span><span>22°</span><span>26°</span><span>30°</span><span>34°</span><span>38°</span></div></div></div>'
      + '<div class="sh-card"><h3>Tu zona</h3><p id="sh-cal-zona" style="margin:0;font-size:14.5px;line-height:1.5"></p><p class="sh-fuente" id="sh-cal-msg" role="status">Toca cualquier punto del mapa para ver su temperatura.</p>'
      + '<p class="sh-fuente" id="sh-cal-fuente"></p></div>');
    var pie = $('#tb .tb-footer'); tb.insertBefore(cal, pie || null);
    var av = $('#avisos'); if (av) av.insertBefore(el('div', { 'class': 'sh-card sh-mis', id: 'sh-mis' }), av.firstChild);
    var nav = el('nav', { 'class': 'sh-nav', 'aria-label': 'Secciones de la app' }, NAV.map(function (n) {
      return '<button type="button" data-v="' + n[0] + '"><span class="sh-ic">' + ic(n[2], 22) + '</span><span>' + n[1] + '</span></button>';
    }).join(''));
    document.body.appendChild(nav);

    // eventos
    nav.addEventListener('click', function (ev) { var b = ev.target.closest('button[data-v]'); if (b) irVista(b.getAttribute('data-v')); });
    seg.addEventListener('click', function (ev) { var b = ev.target.closest('button[data-v]'); if (b) irVista(b.getAttribute('data-v')); });
    $('#sh-lugar').addEventListener('click', hojaLugar);
    $('#sh-gps').addEventListener('click', function () { gpsRapido(this); });
    $('#sh-campana').addEventListener('click', function () { irVista('avisos'); });
    $('#sh-pers').addEventListener('click', hojaAccesos);
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-acc]'); if (a) { var f = ACC.filter(function (x) { return x.id === a.getAttribute('data-acc'); })[0]; if (f) f.f(); return; }
      var i = ev.target.closest('[data-ir]'); if (i) { irVista(i.getAttribute('data-ir')); return; }
      if (ev.target.closest('[data-al]')) abrirAlertas();
    });
    $('#sh-cal-horas').addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-h]'); if (!b || !CAL.datos) return;
      CAL.h = +b.getAttribute('data-h'); pintarHoras(); pintarCapa();
    });
    $('#sh-cal-yo').addEventListener('click', function () { if (CAL.mapa) ubicarEnMapa(false); });
    // Gotita abre su menú (los consejos de cada sección siguen saliendo solos)
    var ava = $('#tb-g-ava');
    if (ava) ava.addEventListener('click', function (ev) { ev.stopImmediatePropagation(); ev.preventDefault(); hojaGotita(); }, true);
    // si otra parte del tablero cambia de pestaña (por ejemplo Gotita), la barra la sigue
    if (window.MutationObserver) new MutationObserver(function () {
      if (sincronizando) return;
      var s = $('#tb .tb-tab[aria-selected="true"]'), id = s && s.getAttribute('aria-controls'), v = TAB2V[id];
      if (v && v !== vista && vista !== 'inicio' && vista !== 'calor') irVista(v, false);
    }).observe(tabs, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });

    pintarLugar(); pintarCampana(); aplicarZona(); pintarInicio(); pintarZona(); pintarAccesos();
    if (!zonaElegida()) zonaInicial();
    if (window.dash && window.dash.onData) try { window.dash.onData(function () { pintarCampana(); pintarInicio(); }); } catch (e) {}
    try { history.replaceState({ shv: 'inicio' }, ''); } catch (e) {}
    irVista('inicio', false);
    if (!LS.get(TOUR, 0)) setTimeout(function () { if (!TOURA && vista === 'inicio' && !hojaAbierta) empezarTour(); }, 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armar); else armar();
})();
