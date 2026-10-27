// Persecución visible: zona de búsqueda alrededor del último rastro y controles de McCuack.
import { CITIES, CITY, BIG, HUB } from '../data/geo.js';
import { dist } from '../lib/util.js';
import { S, policeHere, disguised } from './state.js';

// ---------- Zona de búsqueda ----------
// Nace en la ciudad del último rastro descubierto y crece con las horas: mientras más grande, más dispersa.
export const ZONE = { start: 140, grow: 24, max: 1100 };
export const zoneRadius = () => (S.zone ? Math.min(ZONE.max, ZONE.start + ZONE.grow * (S.hours - S.zone.t)) : 0);
export const inZone = (c) => !!S.zone && dist(c, CITY[S.zone.city]) <= zoneRadius();
// 1 en el centro de una zona recién creada, baja a medida que la zona crece
export const zoneDensity = () => (S.zone ? Math.max(0.15, Math.min(1, 300 / zoneRadius())) : 0);

export function setZone(cityId) { S.zone = { city: cityId, t: S.hours }; }

// ---------- Controles ----------
export const CHECK_HOURS = 36;
export const checkAt = (cityId) => S.checks.some((k) => k.city === cityId && k.until > S.hours);
export const activeChecks = () => S.checks.filter((k) => k.until > S.hours);

// Al descubrir un rastro, McCuack cierra las salidas más probables: el aeropuerto y la ciudad grande más cercanos
export function placeChecks(cityId) {
  const c = CITY[cityId];
  const cand = CITIES.filter((x) => x.id !== cityId && (HUB.has(x.id) || BIG.has(x.id)) && dist(x, c) < 1000 && !x.air)
    .sort((a, b) => dist(a, c) - dist(b, c));
  const hub = cand.find((x) => HUB.has(x.id));
  const picks = [hub, ...cand.filter((x) => x !== hub)].filter(Boolean).slice(0, 2).map((x) => x.id);
  const fresh = picks.filter((id) => !checkAt(id));
  S.checks = activeChecks();
  for (const id of picks) {
    const k = S.checks.find((x) => x.city === id);
    if (k) k.until = S.hours + CHECK_HOURS;
    else S.checks.push({ city: id, until: S.hours + CHECK_HOURS });
  }
  // Máximo 5 controles a la vez: se levantan los más antiguos
  S.checks.sort((a, b) => b.until - a.until);
  S.checks = S.checks.slice(0, 5);
  return fresh;
}

// ---------- Riesgo de redada por hora en tu ciudad ----------
// base: riesgo propio del lugar (hostal, hotel, casa segura...). safe: estás en casa segura.
export function raidRate(base, safe) {
  let r = 0;
  if (policeHere()) r += base * (1 + S.heat / 80);
  if (inZone(CITY[S.cur])) r += 0.003 * zoneDensity() * (1 + S.heat / 60);
  if (checkAt(S.cur)) r += 0.004;
  if (safe) r *= 0.35;
  if (disguised()) r *= 0.6;
  return r * 0.65;
}
