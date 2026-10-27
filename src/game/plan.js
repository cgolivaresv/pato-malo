// Plan de escape: rumores en el bajo mundo, contactos y las tres salidas del continente.
import { CITIES, CITY, COUNTRIES, BIG, inSA } from '../data/geo.js';
import { CONTACTS, LOTS, FENCE_RATE } from '../data/content.js';
import { R, pick, money } from '../lib/util.js';
import { S, crime, me } from './state.js';
import { addTrace, news, pay, advance, after, caught, finish } from './engine.js';
import { checkAt, inZone, zoneDensity, raidRate } from './pursuit.js';
import { maybeEvent } from './events.js';
import { toast } from '../ui/render.js';

export const ASK = { cost: 40000, hours: 3, truth: 0.75, trace: 0.1 };
export const FORGE_CHEAP = { cost: 600000, hours: 10, burn: 0.14 };

// Lo que se busca: los tres contactos y, en la joyería, un reducidor
export function wanted() {
  const out = Object.keys(CONTACTS).filter((k) => !S.contacts[k].found);
  if (crime().id === 'joyas' && !S.sold && !S.fenceKnown.length) out.push('fence');
  return out;
}
const cityOf = (k) => (k === 'fence' ? S.fences[0] : S.contacts[k].city);
const levelOf = (k) => (k === 'fence' ? (S.fenceLvl || 0) : S.contacts[k].lvl);
const setLevel = (k, v) => { if (k === 'fence') S.fenceLvl = v; else S.contacts[k].lvl = v; };
export const contactName = (k) => (k === 'fence' ? 'un reducidor de joyas' : CONTACTS[k].short);

export const canAsk = () => !S.over && S.askedAt[S.cur] !== S.path.length && S.cash >= ASK.cost;

// Preguntar en bares y picadas por un contacto (k): si alguno está aquí, lo encuentras;
// si no, te cuentan un rumor sobre el que buscas (no siempre cierto)
export function askAround(k) {
  if (!canAsk()) return;
  const c = me();
  pay(ASK.cost);
  S.askedAt[c.id] = S.path.length;
  advance(ASK.hours, { where: 'city', rate: 0.05, place: 'la picada' });
  S.awake += ASK.hours;
  if (S.over) return;
  if (R() < ASK.trace) addTrace(c.id, 8, `Informantes del hampa avisan: el prófugo anda preguntando por contactos en ${c.n}.`);

  // ¿Hay alguien aquí?
  const here = [];
  for (const k of Object.keys(CONTACTS)) if (!S.contacts[k].found && S.contacts[k].city === c.id) here.push(k);
  if (crime().id === 'joyas' && !S.sold && S.fences.includes(c.id) && !S.fenceKnown.includes(c.id)) here.push('fence');
  if (here.length) {
    for (const k of here) {
      if (k === 'fence') S.fenceKnown.push(c.id);
      else { S.contacts[k].found = true; S.contacts[k].lvl = 2; }
      news(S.hours, `En ${c.n} diste con ${contactName(k)}. ${k === 'fence' ? 'Compra las joyas.' : `Cobra ${money(CONTACTS[k].price)}.`}`, 'me');
    }
    toast(`¡Encontraste a ${contactName(here[0])}!`);
  } else rumor(c, false, k);
  maybeEvent('city');
  after();
}

// Un rumor sobre alguno de los contactos que buscas. Los verdaderos avanzan: país y luego ciudad.
export function rumor(c, forceTrue = false, want) {
  const opts = wanted();
  if (!opts.length) { news(S.hours, `En ${c.n} nadie sabe nada nuevo.`, 'me'); return; }
  const k = opts.includes(want) ? want : pick(opts);
  const truth = forceTrue || R() < ASK.truth;
  const real = CITY[cityOf(k)];
  let txt, country, city;
  if (truth) {
    const lvl = levelOf(k);
    if (lvl === 0) { country = real.c; setLevel(k, 1); txt = `dicen que ${contactName(k)} anda por ${COUNTRIES[country].n}`; }
    else { city = real.id; setLevel(k, 2); txt = `juran que ${contactName(k)} está en ${real.n}`; }
  } else {
    // Rumor falso: un lugar cualquiera de Sudamérica
    const fake = pick(CITIES.filter((x) => inSA(x) && !x.air && x.id !== real.id && x.c !== real.c));
    if (levelOf(k) === 0 && R() < 0.6) { country = fake.c; txt = `dicen que ${contactName(k)} anda por ${COUNTRIES[country].n}`; }
    else { city = fake.id; txt = `juran que ${contactName(k)} está en ${fake.n}`; }
  }
  S.rumors.push({ k, country: country || null, city: city || null, at: c.id, t: S.hours, ok: truth });
  news(S.hours, `En ${c.n} ${txt}.`, 'me');
}

// ---------- Servicios de los contactos ----------
export const contactHere = (k) => S.contacts[k].found && S.contacts[k].city === S.cur;

// Pasaporte barato: cualquier falsificador de ciudad grande. Rápido de conseguir, pero migraciones lo nota.
export function forgeCheap() {
  if (S.over || S.cash < FORGE_CHEAP.cost || !BIG.has(S.cur) || S.id === 'fake') return;
  pay(FORGE_CHEAP.cost);
  news(S.hours, `Compraste un pasaporte falso barato en ${me().n}. Sirve para los controles, pero en migraciones del extranjero se nota.`, 'me');
  S.idBurnSecret = R() < FORGE_CHEAP.burn;
  if (S.idBurnSecret) addTrace(S.cur, 14, `Detienen a un falsificador en ${me().n}: confiesa haber vendido un pasaporte al prófugo.`);
  advance(FORGE_CHEAP.hours, { where: 'city', rate: 0.05 });
  S.id = 'fake'; S.passQ = 'cheap';
  S.awake += FORGE_CHEAP.hours;
  maybeEvent('city');
  after();
}

// Pasaporte de calidad del falsificador maestro
export function forgeTop() {
  const K = CONTACTS.forger;
  if (S.over || !contactHere('forger') || S.passQ === 'top' || S.cash < K.price) return;
  pay(K.price);
  S.contacts.forger.paid = true;
  advance(K.hours, { where: 'city', rate: 0.04 });
  if (S.over) return;
  S.id = 'fake'; S.passQ = 'top'; S.idBurnSecret = R() < 0.03;
  S.awake += K.hours;
  news(S.hours, `El falsificador maestro te entregó un pasaporte impecable. Ahora puedes volar fuera del continente desde un aeropuerto internacional.`, 'me');
  toast('Pasaporte de calidad listo');
  after();
}

// Reducidor: compra las joyas que te quedan
export function sellFence() {
  if (S.over || S.sold || !S.fenceKnown.includes(S.cur)) return;
  advance(4, { where: 'city', rate: 0.07 });
  S.awake += 4;
  if (S.over) return;
  const gain = crime().lootVal * FENCE_RATE * (0.85 + R() * 0.3) * (S.lots / LOTS.joyas.count);
  S.cash += gain; S.sold = true; S.lots = 0;
  news(S.hours, `Vendiste las joyas al reducidor de ${me().n} por ${money(gain)}.`, 'me');
  if (R() < 0.2) addTrace(S.cur, 5, `El reducidor de ${me().n} cae en un operativo y entrega tu descripción.`);
  after();
}

// ---------- Salidas por carguero y avioneta ----------
const now = () => 22 + S.hours;
// Horas que faltan para el próximo zarpe del capitán (22:00 de sus días)
export function shipWait() {
  const t = now() % 168;
  return Math.min(...S.contacts.captain.days.map((d) => (d * 24 + 22 - t + 168) % 168));
}
// Horas para la próxima salida de la avioneta (03:00)
export const planeWait = () => (27 - (now() % 24) + 24) % 24;

// Riesgo al embarcar: el calor del país y los controles de McCuack
export function shipRisk() { return Math.min(0.95, 0.04 + S.heat / 450 + (checkAt(S.cur) ? 0.12 : 0) + (inZone(me()) ? 0.08 * zoneDensity() : 0)); }
export function planeRisk() { return Math.min(0.95, 0.06 + S.heat / 400 + (checkAt(S.cur) ? 0.2 : 0) + (inZone(me()) ? 0.1 * zoneDensity() : 0)); }
// Riesgo de redada mientras esperas escondido la salida
export const waitRaid = (h) => 1 - Math.pow(1 - raidRate(0.04, false) * 0.25, h / 0.25);

export function canLeaveWithLoot() {
  if (crime().id === 'joyas' && !S.sold) { toast('Primero tienes que vender las joyas.'); return false; }
  return true;
}

export function hireExit(k) {
  const K = CONTACTS[k], ct = S.contacts[k];
  if (S.over || !contactHere(k) || ct.paid || S.cash < K.price) return;
  pay(K.price);
  ct.paid = true;
  S.exit = k;
  news(S.hours, k === 'captain'
    ? `Le pagaste al capitán. El carguero zarpa en ${Math.round(shipWait())} h desde ${me().n}.`
    : `Le pagaste al piloto. La avioneta despega a las 03:00 desde una pista cerca de ${me().n}.`, 'me');
  after();
}

export function leave(k) {
  if (S.over || !contactHere(k) || !S.contacts[k].paid || !canLeaveWithLoot()) return;
  const c = me(), cr = crime();
  const w = k === 'captain' ? shipWait() : planeWait();
  news(S.hours, `Te escondes a esperar ${k === 'captain' ? 'el zarpe del carguero' : 'el despegue de la avioneta'} (${Math.round(w)} h).`, 'me');
  const r = advance(w, { where: 'city', rate: 0.04, place: k === 'captain' ? 'el galpón del puerto' : 'el hangar' });
  if (S.over) return;
  if (r === 'interrupted') { news(S.hours, `Abortaste la salida: con la brigada en ${c.n}, ${k === 'captain' ? 'el capitán no zarpa contigo a bordo' : 'el piloto no despega'} hasta que se vayan.`, 'alert'); after(); return; }
  const p = k === 'captain' ? shipRisk() : planeRisk();
  if (R() < p) {
    caught(k === 'captain'
      ? `La PDI revisó el carguero en ${c.n} justo antes de zarpar. Te encontraron entre los contenedores.`
      : `Una patrulla esperaba en la pista de tierra cerca de ${c.n}. La avioneta nunca despegó.`);
    return;
  }
  const dest = S.buyer ? CITY[S.buyer].n : k === 'captain' ? 'Lisboa' : 'un pueblo de la selva brasileña';
  finish(true, k === 'captain'
    ? `El carguero zarpó de ${c.n} con un pato escondido entre contenedores. ${cr.id === 'arte' ? `Semanas después entregaste el óleo en ${dest}.` : `Desembarcaste en ${dest} con otro nombre.`}`
    : `La avioneta despegó a las 03:00 y voló bajo los radares. ${cr.id === 'arte' ? `Días después entregaste el óleo en ${dest}.` : `Amaneciste en ${dest}, lejos de McCuack.`}`);
}
