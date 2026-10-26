// Calor por país. S.heat es siempre el calor del país donde estás;
// el de los demás países se guarda en S.heatBy y baja con el tiempo.
import { BORDER } from '../data/geo.js';
import { S, me } from './state.js';

const cap = (x) => Math.max(0, Math.min(100, x));

// Calor en un país (después de Interpol, nunca baja de S.heatFloor)
export const heatOf = (c) => (c === me().c ? S.heat : Math.max(S.heatBy[c] ?? 0, S.heatFloor || 0));

export function addHeat(c, n) {
  if (c === me().c) S.heat = cap(S.heat + n);
  else S.heatBy[c] = cap(heatOf(c) + n);
}

// Una noticia sale en el país del rastro y se filtra un poco a sus vecinos
export function spreadHeat(c, n) {
  addHeat(c, n);
  for (const b of BORDER[c] || []) addHeat(b, Math.round(n * 0.3));
}

export function decayAbroad(step) {
  for (const k in S.heatBy) S.heatBy[k] = cap(S.heatBy[k] - step * 0.25);
}

// Al cruzar una frontera: guardas el calor del país que dejas y tomas el del país al que llegas
export function enterCountry(from, to) {
  if (from === to) return;
  const arriving = heatOf(to);
  S.heatBy[from] = S.heat;
  delete S.heatBy[to];
  S.heat = arriving;
}

// Interpol: el calor sube en todas partes y queda un piso
export function interpolHeat() {
  S.heatFloor = 25;
  S.heat = cap(S.heat + 15);
  for (const k in S.heatBy) S.heatBy[k] = cap(S.heatBy[k] + 15);
}
