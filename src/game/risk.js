// Riesgos de los controles y opciones de transporte.
import { CITY, HUB, BORDER, inSA } from '../data/geo.js';
import { clamp01, dist } from '../lib/util.js';
import { S, disguised, interpol } from './state.js';

// Probabilidad de que te detengan en un control de identidad
export function idRisk(kind, from, to) {
  const intl = from.c !== to.c, alertC = (S.alert[from.c] || -1) > S.hours;
  let p = 0;
  if (S.id === 'fake' && !S.idBurnSecret) {
    p = (intl ? 0.045 : 0.025) + S.heat / 750;
    if (interpol()) p *= 1.4;
  } else {
    p = (intl ? 0.17 : 0.06) + S.heat / (intl ? 220 : 400);
    if (interpol()) p = p * 2.4 + 0.08;
  }
  if (kind === 'bus' && !intl) p = S.heat / 2000;
  if (alertC) p += 0.07;
  if (S.police.city === from.id && S.police.arrive == null) p += 0.18;
  if (disguised()) p *= 0.6;
  if (S.perks.press && kind !== 'paso') p *= 0.5;
  return clamp01(p);
}

// 0 = bajo, 1 = medio, 2 = alto
export const riskLevel = (p) => (p < 0.08 ? 0 : p < 0.2 ? 1 : 2);

// Medios de transporte disponibles entre dos ciudades: horas (h), costo (m), riesgo (p)
export function modes(fromId, toId) {
  const from = CITY[fromId], to = CITY[toId], d = dist(from, to), intl = from.c !== to.c, out = [];
  if (fromId === toId) return { d, out };
  const easter = from.air || to.air;
  if (easter && !(fromId === 'santiago' || toId === 'santiago')) return { d, out, note: 'A Isla de Pascua solo se vuela desde Santiago.' };
  const world = !inSA(from) || !inSA(to);
  if (world && inSA(from) && !HUB.has(fromId)) {
    return { d, out, note: 'Los vuelos fuera de Sudamérica salen solo de grandes aeropuertos: Santiago, Buenos Aires, Lima, Bogotá, Caracas, Brasilia, Quito o Montevideo.' };
  }
  out.push({ k: 'air', n: 'Avión', h: 2.5 + d / 800 + (d > 4000 ? 3 : 0) + (intl ? 1 : 0), m: (50000 + d * 58) * (intl ? 1.2 : 1), p: idRisk('air', from, to), id: true });
  if (!world && !easter && d <= 3000) {
    const road = d * 1.3;
    out.push({ k: 'bus', n: 'Bus', h: road / 66 + 0.5 + (intl ? 2 : 0), m: S.perks.bus ? 0 : road * 28, p: idRisk('bus', from, to), id: intl, free: !!S.perks.bus });
  }
  if (!world && !easter && intl && (BORDER[from.c] || []).includes(to.c) && d <= 900) {
    out.push({ k: 'paso', n: 'Paso clandestino', h: d / 22 + 6, m: (220000 + d * 120) * (S.perks.map ? 0.6 : 1), p: clamp01((0.07 + S.heat / 900) * (S.perks.map ? 0.5 : 1)), id: false });
  }
  return { d, out };
}
