// Acciones del prófugo: esconderse, bajo mundo y viajar.
import { CITIES, CITY, COUNTRIES, BIG, inSA } from '../data/geo.js';
import { LOTS } from '../data/content.js';
import { R, pick, money } from '../lib/util.js';
import { S, crime, me, disguised, interpol, policeHere } from './state.js';
import { modes, exitRisk } from './risk.js';
import { maybeEvent } from './events.js';
import { enterCountry } from './heat.js';
import { addTrace, news, pay, advance, after, caught, finish } from './engine.js';
import { toast } from '../ui/render.js';

const REST = {
  hostal: { m: 25000, rate: 0.04, place: 'el hostal' },
  hotel: { m: 65000, rate: 0.05, place: 'el hotel' },
  safe: { m: 0, rate: 0.04, place: 'la casa segura', safe: true },
};

export function rest(kind, forced) {
  if (S.over) return;
  const c = me(), cfg = REST[kind];
  if (S.cash < cfg.m && !forced) return;
  pay(Math.min(cfg.m, S.cash));
  if (kind === 'hotel' && (S.id === 'real' || S.idBurnSecret)) addTrace(c.id, 3, `El registro de un hotel en ${c.n} confirma que pasaste la noche ahí.`);
  if (kind === 'hostal' && R() < 0.3) addTrace(c.id, 10, `La dueña de un hostal en ${c.n} te reconoció en las noticias y llamó a la PDI.`);
  news(S.hours, `Dormiste en ${cfg.place} de ${c.n}.`, 'me');
  const r = advance(8, { where: 'city', rate: cfg.rate, rest: true, place: cfg.place, safe: cfg.safe });
  if (r !== 'interrupted') S.awake = 0;
  if (!forced) maybeEvent('city');
  after();
}

export function lowProfile() {
  if (S.over) return;
  news(S.hours, `Pasaste 4 horas sin salir a la calle en ${me().n}.`, 'me');
  advance(4, { where: 'city', rate: 0.03, rest: true, place: 'tu pieza', safe: S.safe.includes(S.cur) });
  S.awake += 4;
  after();
}

export function disguise() {
  if (S.over || S.cash < 120000) return;
  pay(120000);
  news(S.hours, 'Te cortaste y teñiste el pelo y cambiaste de ropa. Durante 48 h será más difícil reconocerte.', 'me');
  advance(3, { where: 'city', rate: 0.06 });
  S.disguiseUntil = S.hours + 48;
  S.awake += 3;
  after();
}

export function soplon() {
  if (S.over) return;
  if (S.perks.soplon) S.perks.soplon--;
  else { if (S.cash < 200000) return; pay(200000); }
  advance(1, { where: 'city', rate: 0.06 });
  S.soplonUntil = S.hours + 24;
  S.awake += 1;
  // Lo valioso: qué rastros tuyos está por descubrir la PDI, y cuándo
  const pending = S.traces.filter((t) => !t.shown).sort((a, b) => a.at - b.at);
  const po = S.police;
  news(S.hours, pending.length
    ? `Soplón: la PDI está por descubrir ${pending.map((t) => `tu paso por ${CITY[t.city].n} (en ${Math.max(1, Math.round(t.at - S.hours))} h)`).join(', ')}.`
    : 'Soplón: por ahora la PDI no tiene pistas nuevas tuyas.', 'police');
  if (po.arrive != null) news(S.hours, `Soplón: la brigada va camino a ${CITY[po.target].n}.`, 'police');
  after();
}

export function travel(toId, k) {
  if (S.over) return;
  const from = me(), to = CITY[toId];
  const mo = modes(S.cur, toId).out.find((o) => o.k === k);
  if (!mo || mo.closed || S.cash < mo.m) return;
  // Migraciones en destino se calcula con tu calor al partir
  const pExit = inSA(from) && !inSA(to) ? exitRisk() : 0;
  pay(mo.m);
  if (k === 'bus' && mo.free) S.perks.bus--;
  if (S.perks.press && (k === 'air' || mo.id)) S.perks.press--;
  if (R() < mo.p) {
    caught(k === 'paso'
      ? `Una patrulla fronteriza te sorprendió cruzando hacia ${COUNTRIES[to.c].n}.`
      : k === 'air' ? `En el control de embarque de ${from.n} tu documento disparó una alerta. Te esposaron ahí mismo.`
        : from.c !== to.c ? `En la frontera camino a ${to.n} tu documento disparó una alerta. Te bajaron del bus esposado.`
          : `En un control de la PDI en el bus a ${to.n} te pidieron el documento. Se acabó la fuga.`);
    return;
  }
  // Rastros que deja el viaje
  const realId = S.id === 'real' || S.idBurnSecret;
  if (k === 'air') {
    if (realId) addTrace(toId, 1.5, `Migraciones confirma que volaste de ${from.n} a ${to.n} con tu ${S.idBurnSecret ? 'pasaporte falso ya identificado' : 'documento'}.`);
    else if (R() < 0.07) { S.idBurnSecret = true; addTrace(toId, 4, `La PDI descubre tu identidad falsa en el vuelo ${from.n} → ${to.n}.`); }
  } else if (k === 'bus') {
    if (mo.id && realId) addTrace(toId, 4, mo.trace || `El control fronterizo registra tu paso en bus rumbo a ${to.n}.`);
    else if (R() < 0.28) addTrace(toId, 9 + R() * 6, `Cámaras del terminal de ${to.n} te captan bajando de un bus.`);
  } else if (k === 'barco') {
    if (realId && R() < 0.3) addTrace(toId, 12, `La lista de pasajeros del barco a ${to.n} incluye tu nombre real.`);
  } else if (k === 'paso') {
    if (R() < 0.12) addTrace(toId, 20, `Pobladores cerca de ${to.n} reportan a un forastero que cruzó por un paso no habilitado.`);
  }
  news(S.hours, `${mo.n}: ${from.n} → ${to.n} (${money(mo.m)}).`, 'me');
  const sleeps = (k === 'bus' || k === 'barco') && mo.h >= 6;
  advance(mo.h, { where: 'transit', rest: sleeps });
  if (S.over) return;
  S.awake = sleeps ? 0 : S.awake + mo.h;
  // Al cruzar la frontera llegas con el calor que tienes en ese país
  enterCountry(from.c, to.c);
  S.cur = toId; S.path.push(toId); S.dest = ''; S.tab = 'act';
  if (policeHere() && R() < (disguised() ? 0.12 : 0.22)) { caught(`Al llegar a ${to.n} te topaste con la brigada que te esperaba.`); return; }
  if (S.job && S.job.to === toId) {
    S.cash += S.job.rest;
    news(S.hours, `Entregaste el paquete en ${to.n}. La banda te pagó ${money(S.job.rest)}.`, 'me');
    toast(`Encargo cumplido: +${money(S.job.rest)}`);
    S.job = null;
  }
  // Objetivos de salida
  const cr = crime();
  if (!inSA(to)) {
    const goal = cr.id === 'arte' ? toId === S.buyer : cr.obj.includes('sell') ? S.sold : true;
    if (goal) {
      if (R() < pExit) { caught(`Migraciones de ${to.n} te detuvo al pasar el control: ${realId ? 'tu documento real te delató' : S.passQ === 'top' ? 'hasta el mejor pasaporte tiene mala suerte' : 'el pasaporte barato no resistió la lupa'}.`); return; }
      finish(true, cr.id === 'arte' ? `Entregaste el óleo al comprador en ${to.n}. Nadie volvió a saber de ti.` : `Pasaste migraciones en ${to.n} y desapareciste. Nadie volvió a saber de ti.`);
      return;
    }
    toast(cr.id === 'arte' ? `El comprador no está en ${to.n}.` : 'Primero tienes que vender las joyas en Sudamérica.');
  } else {
    toast(`Llegaste a ${to.n}.`);
    maybeEvent('travel', { mode: k, from: from.id, to: toId });
  }
  after();
}
