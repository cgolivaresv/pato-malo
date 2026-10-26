// Acciones del prófugo: esconderse, bajo mundo y viajar.
import { CITIES, CITY, COUNTRIES, BIG, inSA } from '../data/geo.js';
import { LOTS } from '../data/content.js';
import { R, pick, money } from '../lib/util.js';
import { S, crime, me, disguised, interpol, policeHere } from './state.js';
import { modes } from './risk.js';
import { addTrace, news, pay, advance, after, caught, finish } from './engine.js';
import { toast } from '../ui/render.js';

const REST = {
  hostal: { m: 25000, rate: 0.035, place: 'el hostal' },
  hotel: { m: 65000, rate: 0.05, place: 'el hotel' },
  safe: { m: 0, rate: 0.012, place: 'la casa segura' },
};

export function rest(kind, forced) {
  if (S.over) return;
  const c = me(), cfg = REST[kind];
  if (S.cash < cfg.m && !forced) return;
  pay(Math.min(cfg.m, S.cash));
  if (kind === 'hotel' && (S.id === 'real' || S.idBurnSecret)) addTrace(c.id, 3, `El registro de un hotel en ${c.n} confirma que pasaste la noche ahí.`);
  if (kind === 'hostal' && R() < 0.3) addTrace(c.id, 10, `La dueña de un hostal en ${c.n} te reconoció en las noticias y llamó a la PDI.`);
  news(S.hours, `Dormiste en ${cfg.place} de ${c.n}.`, 'me');
  advance(8, { where: 'city', rate: cfg.rate, rest: true, place: cfg.place });
  S.awake = 0;
  after();
}

export function lowProfile() {
  if (S.over) return;
  news(S.hours, `Pasaste 4 horas sin salir a la calle en ${me().n}.`, 'me');
  advance(4, { where: 'city', rate: 0.03, rest: true, place: 'tu pieza' });
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
  const po = S.police;
  news(S.hours, po.city
    ? `Soplón: la brigada está en ${CITY[po.city].n}${po.arrive != null ? ` y viaja a ${CITY[po.target].n}` : ''}. Su última pista eres tú en ${po.known ? CITY[po.known].n : 'ningún lugar'}.`
    : 'Soplón: la policía todavía no se mueve.', 'police');
  after();
}

export function forge() {
  if (S.over || S.cash < 900000 || !BIG.has(S.cur)) return;
  pay(900000);
  news(S.hours, `Pagaste por un pasaporte falso en ${me().n}. Tomó 10 horas.`, 'me');
  S.idBurnSecret = R() < 0.14;
  if (S.idBurnSecret) addTrace(S.cur, 14, `Detienen a un falsificador en ${me().n}: confiesa haber vendido un pasaporte al prófugo.`);
  advance(10, { where: 'city', rate: 0.05 });
  S.id = 'fake';
  S.awake += 10;
  after();
}

export function searchFence() {
  if (S.over || S.cash < 50000) return;
  pay(50000);
  const c = me();
  S.searched[c.id] = true;
  advance(3, { where: 'city', rate: 0.07 });
  S.awake += 3;
  if (S.over) return;
  if (S.fences.includes(c.id)) {
    if (!S.fenceKnown.includes(c.id)) S.fenceKnown.push(c.id);
    news(S.hours, `Encontraste un reducidor en ${c.n}. Compra las joyas, pero quiere la mitad.`, 'me');
  } else {
    const hint = R() < 0.65 ? pick(S.fences) : pick(CITIES.filter((x) => inSA(x) && !S.fences.includes(x.id) && x.id !== c.id)).id;
    news(S.hours, `En ${c.n} no compran nada. Un contacto jura que en ${CITY[hint].n} hay quien compra joyas sin preguntar.`, 'me');
    if (R() < 0.15) addTrace(c.id, 8, `Informantes del hampa avisan: el prófugo anduvo preguntando por reducidores en ${c.n}.`);
  }
  after();
}

export function sell() {
  if (S.over || S.sold || !S.fenceKnown.includes(S.cur)) return;
  advance(4, { where: 'city', rate: 0.07 });
  S.awake += 4;
  if (S.over) return;
  const gain = crime().lootVal * (0.006 + R() * 0.003) * (S.lots / LOTS.joyas.count);
  S.cash += gain; S.sold = true; S.lots = 0;
  news(S.hours, `Vendiste las joyas en ${me().n} por ${money(gain)}.`, 'me');
  if (R() < 0.25) addTrace(S.cur, 5, `El reducidor de ${me().n} cae en un operativo y entrega tu descripción.`);
  after();
}

export function travel(toId, k) {
  if (S.over) return;
  const from = me(), to = CITY[toId];
  const mo = modes(S.cur, toId).out.find((o) => o.k === k);
  if (!mo || S.cash < mo.m) return;
  pay(mo.m);
  if (k === 'bus' && mo.free) S.perks.bus--;
  if (S.perks.press && (k === 'air' || mo.id)) S.perks.press--;
  if (R() < mo.p) {
    caught(k === 'paso'
      ? `Una patrulla fronteriza te sorprendió cruzando hacia ${COUNTRIES[to.c].n}.`
      : `En el control de ${k === 'air' ? 'embarque' : 'la frontera'} de ${from.n} tu documento disparó una alerta. Te esposaron ahí mismo.`);
    return;
  }
  // Rastros que deja el viaje
  const realId = S.id === 'real' || S.idBurnSecret;
  if (k === 'air') {
    if (realId) addTrace(toId, 1.5, `Migraciones confirma que volaste de ${from.n} a ${to.n} con tu ${S.idBurnSecret ? 'pasaporte falso ya identificado' : 'documento'}.`);
    else if (R() < 0.07) { S.idBurnSecret = true; addTrace(toId, 4, `La PDI descubre tu identidad falsa en el vuelo ${from.n} → ${to.n}.`); }
  } else if (k === 'bus') {
    if (mo.id && realId) addTrace(toId, 4, `El control fronterizo registra tu paso en bus rumbo a ${to.n}.`);
    else if (R() < 0.28) addTrace(toId, 9 + R() * 6, `Cámaras del terminal de ${to.n} te captan bajando de un bus.`);
  } else if (k === 'paso') {
    if (R() < 0.12) addTrace(toId, 20, `Pobladores cerca de ${to.n} reportan a un forastero que cruzó por un paso no habilitado.`);
  }
  news(S.hours, `${mo.n}: ${from.n} → ${to.n} (${money(mo.m)}).`, 'me');
  advance(mo.h, { where: 'transit', rest: k === 'bus' && mo.h >= 6 });
  if (S.over) return;
  S.awake = k === 'bus' && mo.h >= 6 ? 0 : S.awake + mo.h;
  S.cur = toId; S.path.push(toId); S.dest = ''; S.tab = 'act';
  if (policeHere() && R() < (disguised() ? 0.15 : 0.28)) { caught(`Al llegar a ${to.n} te topaste con la brigada que te esperaba.`); return; }
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
      let p = (realId ? (interpol() ? 0.7 : 0.35) : (interpol() ? 0.18 : 0.07)) + S.heat / 400;
      if (disguised()) p *= 0.7;
      if (R() < p) { caught(`Migraciones de ${to.n} te detuvo al pasar el control: ${realId ? 'tu documento real' : 'tu pasaporte falso'} no resistió.`); return; }
      finish(true, cr.id === 'arte' ? `Entregaste el óleo al comprador en ${to.n}. Nadie volvió a saber de ti.` : `Pasaste migraciones en ${to.n} y desapareciste. Nadie volvió a saber de ti.`);
      return;
    }
    toast(cr.id === 'arte' ? `El comprador no está en ${to.n}.` : 'Primero tienes que vender las joyas en Sudamérica.');
  } else toast(`Llegaste a ${to.n}.`);
  after();
}
