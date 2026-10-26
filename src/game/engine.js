// Paso del tiempo, rastros, IA policial, recompensas y fin de partida.
import { CITIES, CITY, CONO, HUB } from '../data/geo.js';
import { REWARDS } from '../data/content.js';
import { R, pick, dist, money, store } from '../lib/util.js';
import { S, crime, me, disguised, interpol, policeHere } from './state.js';
import { offerFor } from './money.js';
import { rest } from './actions.js';
import { render, toast } from '../ui/render.js';
import { showEnd } from '../ui/screens.js';
import { zoomMe } from '../ui/map.js';

// Un rastro se crea ahora y la policía lo descubre "delay" horas después
export function addTrace(city, delay, txt) { S.traces.push({ city, at: S.hours + delay, txt, shown: false }); }
export function news(t, x, cls) { S.news.push({ t, x, cls }); if (S.tab !== 'news') S.unread++; }

// Pago en efectivo. Con billetes marcados, los pagos grandes pueden delatarte.
export function pay(m) {
  S.cash -= m;
  if (crime().marked && m >= 150000 && R() < 0.3) addTrace(S.cur, 6 + R() * 6, `Un banco de ${me().n} reporta billetes marcados del asalto. Te buscan en la ciudad.`);
}

// Avanza el reloj en pasos de 15 minutos.
// ctx.where: 'city' | 'transit' · ctx.rate: probabilidad por hora de redada si la policía está en tu ciudad
export function advance(h, ctx) {
  const dt = 0.25;
  let left = h;
  while (left > 1e-9 && !S.over) {
    const step = Math.min(dt, left);
    left -= step;
    S.hours += step;
    S.heat = Math.max(0, S.heat - step * (ctx.rest ? 0.7 : 0.25));
    for (const t of S.traces) {
      if (!t.shown && S.hours >= t.at) {
        t.shown = true;
        S.heat = Math.min(100, S.heat + 14);
        S.alert[CITY[t.city].c] = S.hours + 24;
        S.police.known = t.city;
        S.police.target = t.city;
        news(t.at, t.txt, 'alert');
      }
    }
    if (!S.interpolShown && interpol()) {
      S.interpolShown = true;
      S.heat = Math.min(100, S.heat + 15);
      news(S.hours, 'Interpol emite una notificación roja con tu nombre. Los controles con tu documento real serán mucho más estrictos.', 'alert');
    }
    policeTick(step);
    if (S.job && S.hours > S.job.deadline) {
      const j = S.job, where = ctx.where === 'city' ? S.cur : j.to;
      S.job = null;
      news(S.hours, `No llegaste a tiempo a ${CITY[j.to].n}. La banda está furiosa y dio un dato anónimo a la PDI.`, 'alert');
      addTrace(where, 2, `Llamado anónimo: el prófugo trabaja para una banda y anda cerca de ${CITY[where].n}.`);
    }
    if (S.loan && S.hours > S.loan.due) {
      S.loan = null;
      news(S.hours, 'No pagaste al usurero. Vendió tu paradero a la policía.', 'alert');
      addTrace(S.cur, 1, `Un prestamista entrega a la PDI la ubicación del prófugo en ${me().n}.`);
    }
    if (Math.floor(S.hours / 24) > S.days) { S.days = Math.floor(S.hours / 24); giveReward(); }
    if (ctx.where === 'city' && policeHere()) {
      const rate = ctx.rate * (1 + S.heat / 80) * (disguised() ? 0.6 : 1);
      if (R() < rate * step) { caught(ctx.raidMsg || `La PDI irrumpió en ${ctx.place || 'tu escondite'} de ${me().n}.`); return; }
    }
  }
}

// La brigada viaja al último rastro conocido. Si lo pierde, vigila el aeropuerto internacional más cercano.
function policeTick(step) {
  const po = S.police;
  if (S.hours < crime().alarm) return;
  if (po.city == null) {
    po.city = S.start; po.arrive = null;
    news(S.hours, `Un equipo de la Brigada de Robos llega a ${CITY[S.start].n}.`, 'police');
  }
  if (po.arrive != null && S.hours >= po.arrive) {
    po.city = po.target; po.arrive = null; po.idle = 0;
    if (S.hours < S.soplonUntil) news(S.hours, `Soplón: la brigada aterrizó en ${CITY[po.city].n}.`, 'police');
  }
  if (po.arrive == null) {
    if (po.target && po.target !== po.city) {
      const d = dist(CITY[po.city], CITY[po.target]);
      po.arrive = S.hours + 1.5 + d / 800;
      if (S.hours < S.soplonUntil) news(S.hours, `Soplón: la brigada viaja a ${CITY[po.target].n}.`, 'police');
      return;
    }
    po.idle += step;
    if (po.idle >= 10 && !HUB.has(po.city)) {
      const country = CITY[po.city].c;
      const hubs = [...HUB].map((id) => CITY[id]).filter((c) => c.c === country);
      if (hubs.length) {
        const h = hubs.sort((a, b) => dist(a, CITY[po.city]) - dist(b, CITY[po.city]))[0];
        po.target = h.id; po.idle = 0; S.alert[country] = S.hours + 24;
      }
    }
  }
}

export function giveReward() {
  if (S.over) return;
  const r = pick(REWARDS);
  let txt = r.d;
  if (r.k === 'cash') { const v = 250000 + Math.round(R() * 25) * 10000; S.cash += v; txt = `${r.d} Recibiste ${money(v)}.`; }
  else if (r.k === 'item') S.items.push({ ...r.item });
  else if (r.k === 'press') S.perks.press++;
  else if (r.k === 'map') S.perks.map = true;
  else if (r.k === 'bus') S.perks.bus++;
  else if (r.k === 'soplon') S.perks.soplon++;
  else if (r.k === 'safe') {
    const c = pick(CITIES.filter((x) => x.c === me().c && !S.safe.includes(x.id) && !x.air)) || pick(CITIES.filter((x) => CONO.includes(x.c) && !S.safe.includes(x.id)));
    S.safe.push(c.id);
    txt = `${r.d} Queda en ${c.n}.`;
  }
  S.reward = { day: S.days, n: r.n, d: txt };
  news(S.hours, `Día ${S.days} sin ser atrapado. Recompensa: ${r.n}. ${txt}`, 'me');
  toast(`Día ${S.days} libre: ${r.n}`);
}

export function caught(msg) { finish(false, msg); }

function fatigue() {
  if (S.awake >= 20 && !S.over) { toast('El cansancio te ganó: dormiste 8 horas en un hostal.'); rest('hostal', true); }
}

function canAfford() {
  return S.cash >= 25000 || S.safe.includes(S.cur) || S.items.length > 0 || S.lots > 0 || !S.loan || !S.robbed[S.cur + 'mini'] || !!offerFor(S.cur);
}

// Se llama al terminar cada acción
export function after() {
  if (S.over) return;
  fatigue();
  if (S.over) return;
  if (S.cash < 25000 && !canAfford()) finish(false, 'Te quedaste sin dinero. Sin plata para moverte ni esconderte, te entregaste a la policía.');
  render();
  zoomMe();
}

export function finish(win, msg) {
  if (S.over) return;
  const cr = crime();
  const pts = win ? Math.round(cr.lvl * 1000 + Math.max(0, S.cash) / 2000 + Math.max(0, 240 - S.hours) * 8) : 0;
  S.over = { win, msg, pts };
  const car = store('fuga-career') || { escapes: 0, played: 0, points: 0 };
  car.played++;
  if (win) { car.escapes++; car.points += pts; }
  store('fuga-career', car);
  render();
  showEnd();
}
