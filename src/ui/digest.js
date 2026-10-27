// Parte de novedades: después de cada acción muestra todo lo nuevo que pasó
// (resultados, rumores, rastros descubiertos, movimientos de McCuack) sin tener que abrir Noticias.
// Se queda hasta que el jugador lo cierra; las novedades se acumulan si sigue jugando sin cerrarlo.
import { $, esc, clock } from '../lib/util.js';
import { S } from '../game/state.js';
import { I } from './icons.js';
import { face } from './pato.js';
import { detFace } from './detective.js';
import { sfx } from '../audio/sound.js';

const MAX = 6;
const RANK = { alert: 0, police: 1, me: 2 };
let lastCount = 0;

const pending = () => {
  if (!S || S.over || S.event || S.tab === 'news' || $('#tut')) return 0;
  return Math.min(S.unread, S.news.length);
};

// Hasta MAX novedades, sin dejar fuera ninguna alerta
function pickShown(items) {
  const keep = new Set(items.map((it, i) => (it.cls === 'alert' ? i : -1)).filter((i) => i >= 0).slice(-MAX));
  for (let i = items.length - 1; i >= 0 && keep.size < MAX; i--) keep.add(i);
  return items.filter((_, i) => keep.has(i));
}

export function renderDigest() {
  const d = $('#digest');
  const n = pending();
  if (!n) { d.hidden = true; d.innerHTML = ''; lastCount = 0; return; }
  const items = S.news.slice(-n);
  // Lo más grave primero: alertas, luego McCuack, luego lo tuyo (en orden de hora dentro de cada grupo)
  const shown = pickShown(items).map((it, i) => [it, i]).sort((a, b) => (RANK[a[0].cls] ?? 2) - (RANK[b[0].cls] ?? 2) || a[1] - b[1]).map(([it]) => it);
  const alerts = items.filter((i) => i.cls === 'alert').length;
  const police = items.filter((i) => i.cls === 'police').length;
  const kind = alerts ? 'alert' : police ? 'police' : 'me';
  const chips = [
    alerts ? `<span class="dg-chip alert">${I.warn}${alerts} ${alerts > 1 ? 'alertas' : 'alerta'}</span>` : '',
    police ? `<span class="dg-chip police">${I.shield}${police} McCuack</span>` : '',
  ].join('');
  const more = n - shown.length;
  if (n > lastCount) {
    const fresh = items.slice(lastCount);
    sfx(fresh.some((i) => i.cls === 'alert') ? 'alert' : fresh.some((i) => i.cls === 'police') ? 'radio' : 'news');
  }
  d.className = `digest ${kind}${n > lastCount ? ' pop' : ''}`;
  d.innerHTML = `<div class="dg-head">
      <img src="${kind === 'me' ? face('normal') : detFace(alerts ? 'burlon' : 'serio')}" alt="" width="30" height="30">
      <div><b>Parte</b><small>${n} ${n > 1 ? 'novedades' : 'novedad'}</small></div>
      <div class="dg-chips">${chips}</div>
      <button type="button" class="dg-x" data-act="digestOk" aria-label="Cerrar el parte">${I.close}</button>
    </div>
    <ol class="dg-list">${shown.map((i) => `<li class="dg-it ${i.cls}"><time>${clock(i.t)}</time><span>${esc(i.x)}</span></li>`).join('')}${more ? `<li class="dg-more">y ${more} más en Noticias</li>` : ''}</ol>
    <div class="dg-act"><button type="button" class="btn ghost" data-act="sheet" data-arg="news">Ver noticias</button><button type="button" class="btn" data-act="digestOk">Entendido</button></div>`;
  d.hidden = false;
  lastCount = n;
  place(d);
}

// Justo bajo la barra superior o el aviso de peligro
function place(d) {
  const b = $('#banner');
  const ref = b && !b.hidden ? b : document.querySelector('.topbar');
  d.style.top = `${Math.round(ref.getBoundingClientRect().bottom + 8)}px`;
}

export function dismissDigest() {
  if (S) S.unread = 0;
}
