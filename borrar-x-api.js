/**
 * borrar-x-api.js
 * Borra en bloque tus posts, respuestas, retuits o Me gusta de X (Twitter)
 * desde la consola del navegador, usando la propia sesión abierta.
 *
 * Uso: abre x.com (escritorio), entra en tu perfil -> pestaña Posts, Respuestas
 * o Me gusta, pulsa F5, abre la consola (Ctrl+Shift+J) y pega este archivo.
 *
 * Cómo funciona: aprende la petición real de borrado que hace X cuando borras
 * un elemento y la repite para el resto, varias a la vez. No envía datos a
 * ningún servidor externo ni guarda tokens: todo ocurre en tu navegador.
 *
 * AVISO: uso bajo tu responsabilidad. X puede cambiar su web en cualquier
 * momento y automatizar acciones puede ir contra sus condiciones de uso.
 * Los borrados son irreversibles.
 */
(async () => {
  const PARALELO = 5; // peticiones a la vez (sube a 8 si no sale ningún error)
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = async (fn, timeout = 3000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const r = fn();
      if (r) return r;
      await sleep(10);
    }
    return null;
  };
  const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const RE = /\/graphql\/[^\/]+\/(DeleteTweet|DeleteRetweet|UnfavoriteTweet)/;
  const OPS = { tweet: 'DeleteTweet', rt: 'DeleteRetweet', like: 'UnfavoriteTweet' };

  // --- Interceptores: aprenden la petición real de borrado de X ---
  window.__origFetch = window.__origFetch || window.fetch.bind(window);
  window.__T = window.__T || {};
  const of = window.__origFetch;
  const T = window.__T;
  if (!window.__hooked) {
    window.__hooked = true;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url);
        const m = url && url.match(RE);
        if (m) {
          const headers = {};
          const h = (init && init.headers) || (input && input.headers);
          if (h instanceof Headers) h.forEach((v, k) => { headers[k] = v; });
          else if (Array.isArray(h)) h.forEach(([k, v]) => { headers[k] = v; });
          else if (h) Object.assign(headers, h);
          const body = init && init.body;
          if (typeof body === 'string') T[m[1]] = { url: new URL(url, location.href).href, headers, body };
        }
      } catch (e) {}
      return of(input, init);
    };
    const oo = XMLHttpRequest.prototype.open;
    const os = XMLHttpRequest.prototype.send;
    const oh = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function (m, u) { this._u = u; this._h = {}; return oo.apply(this, arguments); };
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) { if (this._h) this._h[k] = v; return oh.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function (b) {
      try {
        const m = String(this._u).match(RE);
        if (m && typeof b === 'string') T[m[1]] = { url: new URL(String(this._u), location.href).href, headers: Object.assign({}, this._h), body: b };
      } catch (e) {}
      return os.apply(this, arguments);
    };
  }

  // Ocultar imágenes y vídeos: la página va más fluida al hacer scroll
  const st = document.createElement('style');
  st.textContent = 'img,video,[data-testid="tweetPhoto"],[data-testid="videoPlayer"]{display:none!important}';
  document.head.appendChild(st);

  const prof = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
  const me = prof ? (prof.getAttribute('href') || '').replace('/', '').toLowerCase() : null;
  if (!me) { console.error('No encuentro tu perfil. Usa x.com en el navegador de escritorio, con la ventana ancha.'); return; }
  const likes = location.pathname.toLowerCase().endsWith('/likes');
  console.log('Pestaña: ' + (likes ? 'Me gusta' : 'Posts/Respuestas') + ' | Usuario: @' + me);

  const ids = new Map();
  const done = new Set();

  function clasificar(art) {
    const tl = [...art.querySelectorAll('time')].map(x => x.closest('a')).find(Boolean);
    if (!tl) return null;
    const m = (tl.getAttribute('href') || '').match(/^\/([^\/]+)\/status\/(\d+)/);
    if (!m) return null;
    const id = m[2], autor = m[1].toLowerCase();
    if (likes) return art.querySelector('[data-testid="unlike"]') ? { id, type: 'like' } : null;
    if (autor === me) return { id, type: 'tweet' };
    if (art.querySelector('[data-testid="unretweet"]')) return { id, type: 'rt' };
    return null;
  }

  async function accionUI(type, art) {
    if (type === 'like') { art.querySelector('[data-testid="unlike"]').click(); return; }
    if (type === 'rt') {
      art.querySelector('[data-testid="unretweet"]').click();
      const c = await waitFor(() => document.querySelector('[data-testid="unretweetConfirm"]'));
      if (c) c.click();
      return;
    }
    const caret = art.querySelector('[data-testid="caret"]');
    if (!caret) return;
    caret.click();
    const item = await waitFor(() => [...document.querySelectorAll('[role="menuitem"]')]
      .find(i => /Delete|Eliminar|Borrar/i.test(i.textContent)), 2000);
    if (!item) { esc(); return; }
    item.click();
    const c = await waitFor(() => document.querySelector('[data-testid="confirmationSheetConfirm"]'));
    if (c) c.click();
  }

  async function asegurarPlantilla(type, art) {
    const op = OPS[type];
    if (T[op]) return true;
    console.log('Aprendiendo la petición ' + op + ' (borro un elemento con clics)...');
    await accionUI(type, art);
    let ok = await waitFor(() => T[op], 5000);
    if (!ok) {
      console.warn('No la he podido capturar sola. Borra TÚ a mano un ' + (type === 'tweet' ? 'post' : type === 'rt' ? 'retuit (deshacer repost)' : 'Me gusta (quitarlo)') + ' ahora; espero 90 s.');
      ok = await waitFor(() => T[op], 90000);
    }
    return !!ok;
  }

  async function recoger() {
    let sinNuevos = 0, ultimoLog = 0;
    window.scrollTo(0, 0);
    await sleep(800);
    for (let i = 0; i < 2000 && sinNuevos < 10; i++) {
      let nuevos = 0;
      for (const art of document.querySelectorAll('[data-testid="tweet"]')) {
        const c = clasificar(art);
        if (!c || ids.has(c.id) || done.has(c.id)) continue;
        if (!T[OPS[c.type]]) {
          done.add(c.id);
          const ok = await asegurarPlantilla(c.type, art);
          if (!ok) return false;
          nuevos++;
          continue;
        }
        ids.set(c.id, c.type);
        nuevos++;
      }
      sinNuevos = nuevos ? 0 : sinNuevos + 1;
      if (ids.size - ultimoLog >= 100) { ultimoLog = ids.size; console.log('Localizados: ' + ids.size); }
      const retry = [...document.querySelectorAll('button,[role="button"]')]
        .find(b => /^(Retry|Reintentar|Intentar de nuevo)$/i.test((b.textContent || '').trim()));
      if (retry) retry.click();
      window.scrollBy(0, window.innerHeight * 1.5);
      await sleep(500);
    }
    return true;
  }

  async function enviar(op, id, sinTid) {
    try {
      const t = T[op];
      const b = JSON.parse(t.body);
      const key = Object.keys(b.variables).find(k => /tweet_id/.test(k));
      b.variables[key] = id;
      const headers = Object.assign({}, t.headers);
      if (sinTid) Object.keys(headers).forEach(k => { if (/transaction-id/i.test(k)) delete headers[k]; });
      const r = await of(t.url, { method: 'POST', headers, body: JSON.stringify(b), credentials: 'include' });
      let j = null;
      try { j = await r.json(); } catch (e) {}
      return { status: r.status, ok: r.ok && !!j && !j.errors, j, reset: r.headers.get('x-rate-limit-reset') };
    } catch (e) {
      return { status: 0, ok: false, j: String(e), reset: null };
    }
  }

  console.log('Fase 1: localizando tus posts (scroll automático)...');
  const bien = await recoger();
  if (!bien) { console.error('No se pudo aprender la petición de borrado. Para aquí.'); return; }
  const cola = [...ids.entries()].map(([id, type]) => ({ id, type }));
  console.log('Fase 2: borrando ' + cola.length + ' elementos por la API...');
  if (!cola.length) { console.log('No hay nada que borrar en esta pestaña.'); return; }

  // Sonda: comprobar si la petición funciona tal cual o sin el id de transacción
  let sinTid = false, probado = false, n = 0, errores = 0, seguidos = 0, pausaHasta = 0, abortar = false;
  for (let k = 0; k < 3 && cola.length && !probado; k++) {
    const it = cola.shift();
    let r = await enviar(OPS[it.type], it.id, false);
    if (!r.ok && r.status !== 429) {
      const r2 = await enviar(OPS[it.type], it.id, true);
      if (r2.ok) { sinTid = true; r = r2; }
      else console.warn('Prueba fallida. Con id: ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 250) + ' | Sin id: ' + r2.status + ' ' + JSON.stringify(r2.j).slice(0, 250));
    }
    if (r.ok) { probado = true; n++; }
  }
  if (!probado) { console.error('La API no acepta la petición reutilizada. Copia los mensajes de arriba y pásamelos.'); return; }
  console.log('Petición válida' + (sinTid ? ' (sin id de transacción)' : '') + '. Voy a ' + PARALELO + ' en paralelo.');

  async function worker() {
    while (!abortar) {
      const it = cola.shift();
      if (!it) return;
      const w = pausaHasta - Date.now();
      if (w > 0) await sleep(w);
      const r = await enviar(OPS[it.type], it.id, sinTid);
      if (r.status === 429) {
        cola.push(it);
        const reset = parseInt(r.reset, 10) * 1000;
        const espera = reset > Date.now() ? reset - Date.now() + 1000 : 60000;
        pausaHasta = Date.now() + espera;
        console.warn('Límite de X. Pauso ' + Math.round(espera / 1000) + ' s');
        continue;
      }
      if (r.ok) {
        n++; seguidos = 0;
        if (n % 50 === 0) console.log('Borrados: ' + n);
      } else {
        errores++; seguidos++;
        if (errores <= 3) console.warn('Error ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 250));
        if (seguidos >= 25) { abortar = true; console.error('Demasiados errores seguidos. Paro.'); }
      }
    }
  }
  await Promise.all(Array.from({ length: PARALELO }, worker));
  console.log('TERMINADO. Borrados: ' + n + ' | Errores: ' + errores + '. Recarga (F5), comprueba y vuelve a ejecutarlo por si queda algo.');
})();
