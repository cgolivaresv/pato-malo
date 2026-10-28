// Estado de la partida. S es el único objeto de estado; se reemplaza con setS al empezar un golpe.
import { CITIES, CITY, CONO, inSA } from '../data/geo.js';
import { CRIMES, START_ITEMS, CONTACTS } from '../data/content.js';
import { pick, shuffle, dist, setClockStart } from '../lib/util.js';
import { execute } from './heist.js';
import { skill } from './career.js';

export let S = null;
export function setS(v) { S = v; setClockStart(v && v.t0 != null ? v.t0 : 22); }

// El golpe de esta partida, con los cambios del plan (botín, alarma...)
export const crime = () => S.cr || CRIMES.find((c) => c.id === S.crime);
export const me = () => CITY[S.cur];
export const disguised = () => S.hours < S.disguiseUntil;
export const interpol = () => S.hours >= crime().interpol;
export const policeHere = () => S.police.city === S.cur && S.police.arrive == null;

// setup: resultado de execute() (heist.js). Sin setup, se da el golpe con el plan por defecto.
export function newGame(id, setup = execute(id)) {
  const cr = setup.cr;
  const start = CITY[setup.start];
  const fences = shuffle(CITIES.filter((c) => CONO.includes(c.c) && c.id !== start.id && !c.air && dist(start, c) > 400)).slice(0, 4).map((c) => c.id);
  // Casas seguras: más con la habilidad Contactos. En los golpes chicos, al menos dos fuera de Chile.
  const nSafe = 4 + skill('contactos');
  const pool = shuffle(CITIES.filter((c) => CONO.includes(c.c) && c.id !== start.id && c.id !== setup.cur && !fences.includes(c.id)));
  const abroad = cr.obj.includes('cross') ? pool.filter((c) => c.c !== 'CL' && dist(c, start) >= (cr.far || 0)).slice(0, 2) : [];
  const safe = [...abroad, ...pool.filter((c) => !abroad.includes(c))].slice(0, nSafe).map((c) => c.id);
  const buyer = cr.kind === 'art' ? pick(CITIES.filter((c) => !inSA(c) && !['panama', 'mexico', 'habana'].includes(c.id))).id : null;

  // Contactos de salida: cada uno en una ciudad distinta, lejos del golpe
  const used = new Set([start.id]);
  const contacts = {};
  for (const k of Object.keys(CONTACTS)) {
    const opts = CONTACTS[k].cities.filter((c) => !used.has(c) && dist(CITY[c], start) > 300);
    const city = pick(opts.length ? opts : CONTACTS[k].cities.filter((c) => !used.has(c)));
    used.add(city);
    // lvl: 0 nada · 1 sabes el país · 2 sabes la ciudad · found: lo encontraste en persona · paid: ya pagaste
    contacts[k] = { city, lvl: 0, found: false, paid: false };
  }
  // El capitán zarpa dos días a la semana, a las 22:00
  const d = Math.floor(Math.random() * 7);
  contacts.captain.days = [d, (d + 3) % 7];

  return {
    crime: id, cr, heist: { outcome: setup.outcome, plan: setup.plan, notes: setup.notes, contract: setup.contract || null, summary: setup.summary || null }, t0: setup.t0,
    cur: setup.cur, start: start.id, path: setup.cur === start.id ? [start.id] : [start.id, setup.cur], hours: setup.hours, cash: cr.cash, heat: setup.heat, awake: 4 + setup.hours,
    // Documento: real · cheap (pasaporte barato) · top (pasaporte de calidad)
    id: 'real', passQ: null, idBurnSecret: false, disguiseUntil: setup.disguiseUntil, soplonUntil: setup.soplonUntil,
    sold: false, fences, fenceKnown: [], safe, buyer,
    traces: [{ city: start.id, at: cr.alarm, txt: `Alarma en ${start.n}: ${cr.loot} desaparecen. La PDI busca al responsable.`, shown: false }, ...setup.traces.map((t) => ({ ...t, shown: false }))],
    police: { city: null, arrive: null, target: null, idle: 0, known: null },
    alert: {}, news: [], unread: 0, tab: 'act', dest: '', over: null, interpolShown: false, searched: {},
    lots: cr.lot.count, items: START_ITEMS.map((x) => ({ ...x })), job: null, loan: null, offers: {}, robbed: {},
    days: 0, reward: null, perks: { press: 0, map: false, bus: 0, soplon: 0, quiltro: false, chaosUntil: -1 },
    // Calor por país: la noticia del golpe ya se filtró un poco a los vecinos
    heatBy: { AR: 8, PE: 8, BO: 8 }, heatFloor: 0,
    // Estación: en invierno la nieve cierra pasos cordilleranos
    season: Math.random() < 0.5 ? 'invierno' : 'verano',
    // Plan de escape: contactos, rumores (pueden ser falsos) y salida contratada
    contacts, rumors: [], askedAt: {}, exit: null,
    // Persecución: zona de búsqueda alrededor del último rastro y controles de McCuack
    zone: null, checks: [],
    // Evento en curso (espera una decisión) y eventos ya vistos
    event: null, seenEv: {}, evCount: 0,
  };
}
