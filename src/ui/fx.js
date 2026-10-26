// Animación corta de huida al viajar. Se omite si el sistema pide reducir movimiento.
import { CITY } from '../data/geo.js';
import { $, esc } from '../lib/util.js';
import { PATO } from './pato.js';

const VERB = { air: 'Volando a', bus: 'En bus a', paso: 'Cruzando la cordillera hacia' };
let busy = false;

export function playTravel(toId, mode) {
  if (busy || matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  busy = true;
  const fx = $('#fx');
  fx.innerHTML = `<div class="fx-run fx-${mode}"><img src="${PATO}" alt="" width="164" height="228"></div><p>${VERB[mode] || 'Rumbo a'} <b>${esc(CITY[toId].n)}</b>…</p>`;
  fx.hidden = false;
  return new Promise((done) => {
    setTimeout(() => { fx.hidden = true; fx.innerHTML = ''; busy = false; done(); }, 1100);
  });
}
