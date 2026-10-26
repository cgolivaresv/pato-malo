// Momentos animados: huida al viajar y sellos de McCuack.
import { CITY } from '../data/geo.js';
import { $, esc } from '../lib/util.js';
import { PATO } from './pato.js';
import { detFace } from './detective.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const VERB = { air: 'Volando a', bus: 'En bus a', paso: 'Cruzando la cordillera hacia' };
let busy = false;

export function playTravel(toId, mode) {
  if (busy || reduced()) return Promise.resolve();
  busy = true;
  const fx = $('#fx');
  fx.innerHTML = `<div class="fx-road" aria-hidden="true"></div><div class="fx-run fx-${mode}"><img src="${PATO}" alt="" width="150" height="258"></div><p>${VERB[mode] || 'Rumbo a'} <b>${esc(CITY[toId].n)}</b></p>`;
  fx.hidden = false;
  return new Promise((done) => {
    setTimeout(() => { fx.hidden = true; fx.innerHTML = ''; busy = false; done(); }, 1100);
  });
}

// Sello de McCuack cuando la PDI descubre un rastro tuyo
let stampTimer;
export function playStamp(kind, city) {
  const layer = $('#stampLayer');
  const TXT = { ubicado: ['Ubicado', `Pista nueva en ${city}`] };
  const [word, sub] = TXT[kind];
  layer.innerHTML = `<div class="stamp-card" role="alert"><img src="${detFace('burlon')}" alt="Detective McCuack" width="72" height="72"><div class="stamp">${esc(word)}</div><p>${esc(sub)}</p><small>Toca para seguir</small></div>`;
  layer.hidden = false;
  layer.classList.toggle('still', reduced());
  clearTimeout(stampTimer);
  stampTimer = setTimeout(hideStamp, 2200);
}
export function hideStamp() { const l = $('#stampLayer'); l.hidden = true; l.innerHTML = ''; }

// Sello grande del resultado (dentro de la ventana final)
export function endStamp(win) {
  return win
    ? '<div class="stamp big closed" aria-hidden="true"><span>Caso cerrado</span></div>'
    : '<div class="stamp big caught" aria-hidden="true"><span>Detenido</span></div>';
}
