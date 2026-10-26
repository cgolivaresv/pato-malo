// Formas de conseguir dinero: botín, tus cosas, encargos, asaltos y usurero.
import { CITIES, CITY, CONO, inSA } from '../data/geo.js';
import { LOTS } from '../data/content.js';
import { R, pick, dist, money } from '../lib/util.js';
import { S, crime, me, disguised } from './state.js';
import { addTrace, news, advance, after, caught } from './engine.js';
import { render } from '../ui/render.js';

// Precio de un lote vendido en la calle (mitad de lo que pagaría un reducidor)
export function lotValue() {
  const cr = crime();
  return cr.id === 'joyas' ? (cr.lootVal * 0.0075) / LOTS.joyas.count / 2 : LOTS[cr.id].val / 2;
}

export function sellLot() {
  if (S.over || S.lots <= 0) return;
  const c = me(), cr = crime();
  advance(2, { where: 'city', rate: 0.07 });
  S.awake += 2;
  if (S.over) return;
  const gain = lotValue() * (0.85 + R() * 0.3);
  S.cash += gain;
  S.lots--;
  if (cr.id === 'joyas' && S.lots === 0) S.sold = true;
  news(S.hours, `Vendiste ${LOTS[cr.id].n} en la calle de ${c.n} por ${money(gain)}, la mitad de lo que vale.`, 'me');
  if (R() < (cr.marked ? 0.35 : 0.25)) addTrace(c.id, 4 + R() * 6, `Aparece en ${c.n} parte del botín: ${LOTS[cr.id].n.replace(/^una? /, '')}. La PDI interroga al comprador.`);
  after();
}

export function sellItem(i) {
  if (S.over) return;
  const it = S.items[i];
  if (!it) return;
  advance(1, { where: 'city', rate: 0.06 });
  S.awake += 1;
  if (S.over) return;
  const gain = it.v * (0.8 + R() * 0.3);
  S.cash += gain;
  S.items.splice(i, 1);
  news(S.hours, `Vendiste tu ${it.n.toLowerCase()} en ${me().n} por ${money(gain)}.`, 'me');
  if (it.risk && R() < it.risk) addTrace(S.cur, 8 + R() * 10, it.tr);
  after();
}

// Encargo de una banda: una oferta por ciudad, a otra ciudad del cono sur
export function offerFor(id) {
  if (id in S.offers) return S.offers[id];
  const c = CITY[id];
  if (!inSA(c)) { S.offers[id] = null; return null; }
  const cands = CITIES.filter((x) => CONO.includes(x.c) && !x.air && x.id !== id && dist(x, c) > 250 && dist(x, c) < 1600);
  // Ciudades lejanas (Caracas, Bogotá…) no tienen encargos posibles
  if (!cands.length) { S.offers[id] = null; return null; }
  const to = pick(cands), d = dist(c, to);
  const total = Math.round((250000 + d * 420) / 10000) * 10000;
  S.offers[id] = { to: to.id, total, adv: Math.round((total * 0.3) / 10000) * 10000, hours: Math.ceil(((d * 1.3) / 66) * 1.6 + 10) };
  return S.offers[id];
}

export function acceptJob() {
  const o = offerFor(S.cur);
  if (!o || S.job || S.over) return;
  S.job = { to: o.to, rest: o.total - o.adv, deadline: S.hours + o.hours };
  S.cash += o.adv;
  S.offers[S.cur] = null;
  news(S.hours, `Aceptaste mover un paquete a ${CITY[o.to].n} para una banda. Adelanto: ${money(o.adv)}. Plazo: ${o.hours} h.`, 'me');
  advance(1, { where: 'city', rate: 0.06 });
  S.awake += 1;
  after();
}

export const ROBBERY = {
  mini: { h: 2, min: 120000, max: 350000, base: 0.05, heatDiv: 600, tr: 3, lbl: 'un minimarket' },
  cambio: { h: 3, min: 500000, max: 1300000, base: 0.12, heatDiv: 400, tr: 2, lbl: 'una casa de cambio' },
};
export const robberyRisk = (kind) => ROBBERY[kind].base + S.heat / ROBBERY[kind].heatDiv;

export function robbery(kind) {
  if (S.over || S.robbed[S.cur + kind]) return;
  const c = me(), cfg = ROBBERY[kind], p = robberyRisk(kind);
  S.robbed[S.cur + kind] = true;
  advance(cfg.h, { where: 'city', rate: 0.08 });
  S.awake += cfg.h;
  if (S.over) return;
  if (R() < (disguised() ? p * 0.7 : p)) { caught(`Asaltaste ${cfg.lbl} en ${c.n}, pero una patrulla pasaba por ahí. Te reconocieron de inmediato.`); return; }
  const gain = cfg.min + R() * (cfg.max - cfg.min);
  S.cash += gain;
  S.heat = Math.min(100, S.heat + 10);
  news(S.hours, `Asaltaste ${cfg.lbl} en ${c.n}: ${money(gain)}.`, 'me');
  addTrace(c.id, cfg.tr, `Asalto a ${cfg.lbl} en ${c.n}: las cámaras muestran a alguien parecido al prófugo.`);
  after();
}

export const LOAN = { amount: 1000000, owe: 1500000, hours: 72 };

export function borrow() {
  if (S.over || S.loan) return;
  S.loan = { due: S.hours + LOAN.hours, owe: LOAN.owe };
  S.cash += LOAN.amount;
  news(S.hours, `Un usurero de ${me().n} te prestó ${money(LOAN.amount)}. Debes devolverle ${money(LOAN.owe)} en ${LOAN.hours} h.`, 'me');
  advance(1, { where: 'city', rate: 0.06 });
  S.awake += 1;
  after();
}

export function repay() {
  if (S.over || !S.loan || S.cash < S.loan.owe) return;
  S.cash -= S.loan.owe;
  S.loan = null;
  news(S.hours, 'Pagaste al usurero. Asunto cerrado.', 'me');
  render();
}
