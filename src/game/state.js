// Estado de la partida. S es el único objeto de estado; se reemplaza con setS al empezar un golpe.
import { CITIES, CITY, CONO, inSA } from '../data/geo.js';
import { CRIMES, LOTS, START_ITEMS } from '../data/content.js';
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
  const fences = shuffle(CITIES.filter((c) => CONO.includes(c.c) && c.id !== start.id && !c.air && dist(start, c) > 400)).slice(0, 3).map((c) => c.id);
  const safe = shuffle(CITIES.filter((c) => CONO.includes(c.c) && c.id !== start.id && !fences.includes(c.id))).slice(0, 4).map((c) => c.id);
  const buyer = cr.id === 'arte' ? pick(CITIES.filter((c) => !inSA(c) && !['panama', 'mexico', 'habana'].includes(c.id))).id : null;
  return {
    crime: id, cur: start.id, start: start.id, path: [start.id], hours: 0, cash: cr.cash, heat: 20, awake: 4,
    id: 'real', idBurnSecret: false, disguiseUntil: -1, soplonUntil: -1,
    sold: false, fences, fenceKnown: [], safe, buyer,
    traces: [{ city: start.id, at: cr.alarm, txt: `Alarma en ${start.n}: ${cr.loot} desaparecen. La PDI busca al responsable.`, shown: false }],
    police: { city: null, arrive: null, target: null, idle: 0, known: null },
    alert: {}, news: [], unread: 0, tab: 'act', dest: '', over: null, interpolShown: false, searched: {},
    lots: LOTS[id].count, items: START_ITEMS.map((x) => ({ ...x })), job: null, loan: null, offers: {}, robbed: {},
    days: 0, reward: null, perks: { press: 0, map: false, bus: 0, soplon: 0 },
  };
}
