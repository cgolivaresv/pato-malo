// Carrera criminal de Pato Malo: experiencia, rango, golpes desbloqueados y habilidades.
// Se guarda en el navegador y sobrevive entre partidas.
import { CRIMES, RANKS, SKILLS } from '../data/content.js';
import { store } from '../lib/util.js';

const KEY = 'pato-carrera';
const MAX_SKILL = 3;

function fresh() {
  const skills = Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0]));
  // Quien ya jugaba antes de la carrera no parte de cero
  const old = store('fuga-career');
  const xp = old ? Math.min(900, (old.escapes || 0) * 180 + (old.played || 0) * 25) : 0;
  return { xp, sp: rankOf(xp), skills, golpes: 0, escapes: old ? old.escapes || 0 : 0, played: old ? old.played || 0 : 0, points: old ? old.points || 0 : 0, best: {} };
}

export function career() {
  const c = store(KEY);
  if (c && c.skills) {
    for (const k of Object.keys(SKILLS)) if (c.skills[k] == null) c.skills[k] = 0;
    return c;
  }
  const f = fresh();
  store(KEY, f);
  return f;
}
const save = (c) => store(KEY, c);

export function rankOf(xp) {
  let r = 0;
  RANKS.forEach((k, i) => { if (xp >= k.xp) r = i; });
  return r;
}
export const rankName = (r) => RANKS[r].n;
export const nextRank = (xp) => RANKS[rankOf(xp) + 1] || null;
export const unlocked = (cr, c = career()) => rankOf(c.xp) >= cr.rank;
export const crimesFor = (c = career()) => CRIMES.map((cr) => ({ ...cr, open: unlocked(cr, c) }));

// Nivel de una habilidad (0-3) para usar dentro de la partida
export const skill = (k) => { const c = store(KEY); return (c && c.skills && c.skills[k]) || 0; };

export function buySkill(k) {
  const c = career();
  if (!SKILLS[k] || c.sp < 1 || c.skills[k] >= MAX_SKILL) return false;
  c.sp--; c.skills[k]++;
  save(c);
  return true;
}
export const MAX_SKILL_LVL = MAX_SKILL;

// Experiencia que deja una fuga. Siempre se gana algo, aunque te atrapen.
export function xpFor({ lvl, days, win, clean }) {
  const parts = [['Golpe dado', 30 * lvl]];
  if (days) parts.push([`${days} ${days === 1 ? 'día libre' : 'días libres'}`, 10 * days]);
  if (clean) parts.push(['Golpe limpio', 15 * lvl]);
  if (win) parts.push(['Fuga exitosa', 80 * lvl]);
  return parts;
}

// Registra el final de una fuga. Devuelve lo ganado y si subiste de rango.
export function recordRun({ crimeId, lvl, days, win, clean, pts }) {
  const c = career();
  const parts = xpFor({ lvl, days, win, clean });
  const gain = parts.reduce((a, p) => a + p[1], 0);
  const before = rankOf(c.xp);
  c.xp += gain;
  c.golpes++;
  c.played++;
  if (win) { c.escapes++; c.points += pts; c.sp++; c.best[crimeId] = Math.max(c.best[crimeId] || 0, pts); }
  const after = rankOf(c.xp);
  if (after > before) c.sp += after - before;
  save(c);
  // Compatibilidad con el récord de la pantalla de inicio
  store('fuga-career', { escapes: c.escapes, played: c.played, points: c.points });
  const newCrimes = CRIMES.filter((cr) => cr.rank > before && cr.rank <= after).map((cr) => cr.n);
  return { parts, gain, before, after, newCrimes, points: (win ? 1 : 0) + (after - before) };
}
