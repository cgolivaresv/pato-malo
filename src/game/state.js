// Estado de la partida. S es el único objeto de estado; se reemplaza con setS al empezar un golpe.
import { CITIES, CITY, CONO, inSA } from '../data/geo.js';
import { CRIMES, LOTS, START_ITEMS, CONTACTS } from '../data/content.js';
import { pick, shuffle, dist } from '../lib/util.js';

export let S = null;
export function setS(v) { S = v; }

export const crime = () => CRIMES.find((c) => c.id === S.crime);
export const me = () => CITY[S.cur];
export const disguised = () => S.hours < S.disguiseUntil;
export const interpol = () => S.hours >= crime().interpol;
export const policeHere = () => S.police.city === S.cur && S.police.arrive == null;

export function newGame(id) {
  const cr = CRIMES.find((c) => c.id === id);
  const start = pick(CITIES.filter((c) => c.c === 'CL' && !c.air));
  const fences = shuffle(CITIES.filter((c) => CONO.includes(c.c) && c.id !== start.id && !c.air && dist(start, c) > 400)).slice(0, 4).map((c) => c.id);
  const safe = shuffle(CITIES.filter((c) => CONO.includes(c.c) && c.id !== start.id && !fences.includes(c.id))).slice(0, 4).map((c) => c.id);
  const buyer = cr.id === 'arte' ? pick(CITIES.filter((c) => !inSA(c) && !['panama', 'mexico', 'habana'].includes(c.id))).id : null;

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
    crime: id, cur: start.id, start: start.id, path: [start.id], hours: 0, cash: cr.cash, heat: 20, awake: 4,
    // Documento: real · cheap (pasaporte barato) · top (pasaporte de calidad)
    id: 'real', passQ: null, idBurnSecret: false, disguiseUntil: -1, soplonUntil: -1,
    sold: false, fences, fenceKnown: [], safe, buyer,
    traces: [{ city: start.id, at: cr.alarm, txt: `Alarma en ${start.n}: ${cr.loot} desaparecen. La PDI busca al responsable.`, shown: false }],
    police: { city: null, arrive: null, target: null, idle: 0, known: null },
    alert: {}, news: [], unread: 0, tab: 'act', dest: '', over: null, interpolShown: false, searched: {},
    lots: LOTS[id].count, items: START_ITEMS.map((x) => ({ ...x })), job: null, loan: null, offers: {}, robbed: {},
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
