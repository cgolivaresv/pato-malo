// Simulador de balance (solo desarrollo): juega muchas fugas con estrategias automáticas.
// Uso: npm run dev → abrir /pato-malo/sim/ → en la consola, runSim(120)
import '../src/styles.css';
import { initMap } from '../src/ui/map.js';
import { CITIES, CITY, HUB, BIG, inSA } from '../src/data/geo.js';
import { CONTACTS } from '../src/data/content.js';
import { S, setS, newGame } from '../src/game/state.js';
import { travel, rest, lowProfile } from '../src/game/actions.js';
import { sellLot, sellItem } from '../src/game/money.js';
import { modes } from '../src/game/risk.js';
import { askAround, canAsk, forgeCheap, forgeTop, sellFence, hireExit, leave, contactHere, FORGE_CHEAP } from '../src/game/plan.js';
import { checkAt, inZone, zoneDensity } from '../src/game/pursuit.js';
import { eventChoices, resolveEvent, closeEvent } from '../src/game/events.js';
import { dist } from '../src/lib/util.js';

initMap();
let acts = 0;
const busy = () => S.over;

// Elige siempre la opción de menor riesgo que puedas pagar
function autoEvent() {
  let n = 0;
  while (S.event && !S.over && n++ < 5) {
    const ch = eventChoices();
    let best = 0, bl = 9;
    ch.forEach((c, i) => { const l = (c.chips && c.chips.riskLvl) ?? 1; if ((!c.need || S.cash >= c.need) && l < bl) { bl = l; best = i; } });
    resolveEvent(best);
    closeEvent();
  }
}
const A = (fn, ...a) => { if (busy()) return; acts++; fn(...a); autoEvent(); };

// Viaje con el medio de menor costo de riesgo (riesgo + horas)
function go(to) {
  if (inSA(CITY[to]) && ((S.police.city === to && S.police.arrive == null) || (S.police.arrive != null && S.police.target === to))) return false;
  const m = modes(S.cur, to).out.filter((o) => !o.closed && S.cash >= o.m);
  if (!m.length) return false;
  m.sort((a, b) => (a.p + a.h / 400) - (b.p + b.h / 400));
  const info = { p: +m[0].p.toFixed(3), k: m[0].k, intl: CITY[S.cur].c !== CITY[to].c, chkFrom: checkAt(S.cur), chkTo: checkAt(to), copFrom: S.police.city === S.cur && S.police.arrive == null, zone: inZone(CITY[S.cur]) ? +zoneDensity().toFixed(2) : 0, alert: (S.alert[CITY[S.cur].c] || -1) > S.hours, id: S.id + (S.passQ || ''), heat: Math.round(S.heat), ev: !!S.event };
  A(travel, to, m[0].k);
  if (S.over && !S.over.win && /control|frontera|embarque/.test(S.over.msg)) (window.__dbg = window.__dbg || []).push(info);
  return true;
}
const near = (list) => list.filter((id) => id !== S.cur).sort((a, b) => dist(CITY[a], CITY[S.cur]) - dist(CITY[b], CITY[S.cur]));
const nearestHub = () => near([...HUB].filter((i) => inSA(CITY[i])))[0];
const exitTo = () => S.buyer || 'madrid';
const restHere = () => A(rest, S.safe.includes(S.cur) ? 'safe' : 'hostal');

// ---------- Estrategias ingenuas ----------
function directo() {
  if (S.crime === 'joyas') while (S.lots > 0 && !busy()) A(sellLot);
  if (!HUB.has(S.cur)) go(nearestHub());
  go(exitTo());
}
function barato() {
  if (S.crime === 'joyas') while (S.lots > 0 && !busy()) A(sellLot);
  if (!HUB.has(S.cur)) go(nearestHub());
  A(forgeCheap);
  if (S.awake > 12) restHere();
  go(exitTo());
}

// ---------- Estrategia planificada ----------
function knowledge(k) { const c = S.contacts[k]; return c.found ? 3 : c.lvl; }
// Ciudad más probable según los rumores (cuenta repeticiones)
function rumorCity(k) {
  const cnt = {};
  const ok = (id) => (k === 'fence' ? ['CL', 'AR', 'PE', 'BO'].includes(CITY[id].c) : CONTACTS[k].cities.includes(id));
  for (const r of S.rumors.filter((x) => x.k === k && x.city && ok(x.city))) cnt[r.city] = (cnt[r.city] || 0) + 1;
  return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0];
}
function rumorCountry(k) {
  const cnt = {};
  for (const r of S.rumors.filter((x) => x.k === k && x.country)) cnt[r.country] = (cnt[r.country] || 0) + 1;
  return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0];
}
function nextAskCity(k) {
  const cand = k === 'fence' ? CITIES.filter((c) => ['CL', 'AR', 'PE', 'BO'].includes(c.c) && !c.air).map((c) => c.id) : CONTACTS[k].cities;
  const country = rumorCountry(k);
  let pool = cand.filter((id) => S.askedAt[id] == null && S.police.city !== id && !checkAt(id));
  if (country && pool.some((id) => CITY[id].c === country)) pool = pool.filter((id) => CITY[id].c === country);
  if (!pool.length) pool = CITIES.filter((c) => inSA(c) && !c.air && S.askedAt[c.id] == null).map((c) => c.id);
  return near(pool)[0];
}

function plan(pref) {
  let steps = 0;
  while (!busy() && steps++ < 140) {
    autoEvent();
    if (busy()) break;
    // Descansar: siempre que sea mucho rato despierto, o con calor alto en una casa segura
    if (S.awake >= 14 || (S.heat >= 55 && S.safe.includes(S.cur))) { restHere(); continue; }
    // Huir de la brigada
    if ((S.police.city === S.cur && S.police.arrive == null) || (S.police.arrive != null && S.police.target === S.cur)) { const d = near(CITIES.filter((c) => inSA(c) && !c.air && c.c === CITY[S.cur].c && !checkAt(c.id)).map((c) => c.id))[0]; if (d && go(d)) continue; }
    // Moverse tranquilo: primero un pasaporte barato en una ciudad grande del país, sin control ni brigada
    if (S.id === 'real' && S.cash > FORGE_CHEAP.cost + 1500000) {
      if (BIG.has(S.cur) && !checkAt(S.cur)) { A(forgeCheap); continue; }
      const big = near([...BIG].filter((id) => CITY[id].c === CITY[S.cur].c && !checkAt(id) && S.police.city !== id))[0];
      if (big && go(big)) continue;
    }
    // Joyería: vender primero
    if (S.crime === 'joyas' && !S.sold) {
      if (S.fenceKnown.includes(S.cur)) { A(sellFence); continue; }
      if (S.fenceKnown.length) { if (!go(S.fenceKnown[0])) A(lowProfile); continue; }
      if (canAsk()) { A(askAround, 'fence'); continue; }
      const t = rumorCity('fence') && S.askedAt[rumorCity('fence')] == null ? rumorCity('fence') : nextAskCity('fence');
      if (!t || !go(t)) A(lowProfile); continue;
    }
    // Elegir el contacto mejor conocido (empate: preferencia)
    const ks = Object.keys(CONTACTS).sort((a, b) => knowledge(b) - knowledge(a) || pref.indexOf(a) - pref.indexOf(b));
    const k = ks[0], ct = S.contacts[k], K = CONTACTS[k];
    if (ct.found) {
      if (S.cash < (k === 'forger' ? K.price + 400000 : K.price) && !ct.paid) {
        if (S.lots > 0) { A(sellLot); continue; }
        if (S.items.length) { A(sellItem, 0); continue; }
        break; // sin plata
      }
      if (S.cur !== ct.city && !(k === 'forger' && ct.paid)) { if (!go(ct.city)) A(lowProfile); continue; }
      if (k === 'forger') {
        if (S.passQ !== 'top') { A(forgeTop); continue; }
        // Volar desde un aeropuerto sin control
        if (!HUB.has(S.cur) || checkAt(S.cur)) { const h = near([...HUB].filter((i) => inSA(CITY[i]) && !checkAt(i) && S.police.city !== i))[0]; if (!h || !go(h)) A(lowProfile); continue; }
        if (S.heat > 45 && S.safe.includes(S.cur)) { restHere(); continue; }
        go(exitTo()); continue;
      }
      if (!ct.paid) { A(hireExit, k); continue; }
      if (S.heat > 50 || checkAt(S.cur)) { A(rest, 'hostal'); continue; }
      A(leave, k); continue;
    }
    if (canAsk()) { A(askAround, k); continue; }
    const rc = rumorCity(k);
    const t = rc && S.askedAt[rc] == null ? rc : nextAskCity(k);
    if (!t || !go(t)) A(lowProfile);
  }
}

const STRATS = {
  directo, barato,
  plan_vuelo: () => plan(['forger', 'pilot', 'captain']),
  plan_barco: () => plan(['captain', 'pilot', 'forger']),
  plan_avioneta: () => plan(['pilot', 'captain', 'forger']),
};

window.runSim = (n = 100, only) => {
  const out = {};
  for (const name in STRATS) {
    if (only && !only.includes(name)) continue;
    for (const cr of ['camion', 'joyas', 'arte']) {
      let w = 0, a = 0, h = 0, ev = 0;
      const why = {};
      for (let i = 0; i < n; i++) {
        setS(newGame(cr)); acts = 0;
        try { STRATS[name](); } catch (e) { why['error ' + e.message] = (why['error ' + e.message] || 0) + 1; }
        ev += S.evCount;
        if (S.over && S.over.win) { w++; a += acts; h += S.hours; }
      else if (!S.over) (window.__stuck = window.__stuck || []).push({ cr, name, cash: Math.round(S.cash), id: S.id + (S.passQ || ''), at: CITY[S.cur].n, hours: Math.round(S.hours), contacts: Object.fromEntries(Object.entries(S.contacts).map(([k, v]) => [k, (v.found ? 'F' : 'L' + v.lvl) + ':' + CITY[v.city].n])), sold: S.sold, last: S.news.slice(-2).map((n) => n.x) });
        else { const k = S.over ? S.over.msg.slice(0, 40) : 'sin terminar'; why[k] = (why[k] || 0) + 1; }
      }
      out[`${name}/${cr}`] = { gana: Math.round((w / n) * 100), acciones: w ? +(a / w).toFixed(1) : 0, horas: w ? Math.round(h / w) : 0, eventos: +(ev / n).toFixed(1), pierde: Object.entries(why).sort((x, y) => y[1] - x[1]).slice(0, 3) };
    }
  }
  return out;
};
window.logGame = (strat = 'plan_vuelo', cr = 'camion') => {
  setS(newGame(cr)); acts = 0;
  STRATS[strat]();
  const C = (id) => CITY[id].n;
  return { start: C(S.start), contacts: Object.fromEntries(Object.entries(S.contacts).map(([k, v]) => [k, C(v.city)])), win: S.over && S.over.win, end: S.over ? S.over.msg : 'sin terminar', hours: Math.round(S.hours), news: S.news.map((n) => `${Math.round(n.t)}h ${n.x}`) };
};
window.__ready = true;
