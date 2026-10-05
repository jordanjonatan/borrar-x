/**
 * borrar-x-clics.js
 * Alternativa más lenta pero más simple: borra pulsando los botones de la
 * interfaz de X, uno a uno. Úsala si la versión API deja de funcionar.
 * Ejecútala en la pestaña Posts, Respuestas o Me gusta (tras F5).
 * Uso bajo tu responsabilidad; los borrados son irreversibles.
 */
(async () => {
  const st = document.createElement('style');
  st.textContent = 'img,video,[data-testid="tweetPhoto"],[data-testid="videoPlayer"]{display:none!important}';
  document.head.appendChild(st);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = async (fn, timeout = 2000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const r = fn();
      if (r) return r;
      await sleep(5);
    }
    return null;
  };
  const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const libre = () => !document.querySelector('[data-testid="confirmationSheetConfirm"]') && !document.querySelector('[role="menu"]');
  const likes = location.pathname.endsWith('/likes');

  let borrados = 0, vacios = 0, fallos = 0;
  while (vacios < 12 && fallos < 6) {
    const t = document.querySelector('[data-testid="tweet"]:not([data-skip])');
    if (!t) {
      vacios++;
      if (vacios % 4 === 0) {
        document.querySelector('a[role="tab"][aria-selected="true"]')?.click();
        window.scrollTo(0, 0);
        await sleep(1200);
      } else {
        window.scrollBy(0, 2000);
        await sleep(250);
      }
      continue;
    }
    vacios = 0;
    if (!libre()) await waitFor(libre, 1000);

    let ok = false;
    if (likes) {
      const u = t.querySelector('[data-testid="unlike"]');
      t.setAttribute('data-skip', '1');
      if (!u) continue;
      u.click(); borrados++;
      if (borrados % 50 === 0) console.log('Quitados: ' + borrados);
      await sleep(60);
      continue;
    }

    const unrt = t.querySelector('[data-testid="unretweet"]');
    if (unrt) {
      unrt.click();
      const c = await waitFor(() => document.querySelector('[data-testid="unretweetConfirm"]'));
      if (c) { c.click(); ok = true; }
    } else {
      const caret = t.querySelector('[data-testid="caret"]');
      if (!caret) { t.setAttribute('data-skip', '1'); continue; }
      caret.click();
      const item = await waitFor(() => [...document.querySelectorAll('[role="menuitem"]')]
        .find(i => /Delete|Eliminar|Borrar/i.test(i.textContent)), 900);
      if (!item) { esc(); t.setAttribute('data-skip', '1'); await sleep(60); continue; }
      item.click();
      const c = await waitFor(() => document.querySelector('[data-testid="confirmationSheetConfirm"]'));
      if (c) { c.click(); ok = true; }
    }

    t.setAttribute('data-skip', '1');
    if (ok) {
      borrados++; fallos = 0;
      if (borrados % 25 === 0) console.log('Borrados: ' + borrados);
    } else {
      fallos++;
      console.warn('Fallo ' + fallos + ', espero...');
      esc();
      await sleep(fallos * 2000);
    }
  }
  console.log('Terminado. Borrados: ' + borrados + '. Recarga y vuelve a ejecutarlo por si queda algo.');
})();
