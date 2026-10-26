// Simulador de balance (solo desarrollo): juega muchas fugas con estrategias simples.
import '../src/styles.css';
import { initMap } from '../src/ui/map.js';
import { CITY, HUB, inSA } from '../src/data/geo.js';
import { S, setS, newGame } from '../src/game/state.js';
import { travel, rest, forge, disguise, sell, searchFence } from '../src/game/actions.js';
import { sellLot } from '../src/game/money.js';
import { modes } from '../src/game/risk.js';
import { dist } from '../src/lib/util.js';

initMap();
let acts = 0;
const A = (fn) => (...a) => { if (!S.over) { acts++; fn(...a); } };
const go = A((to, prefs) => { const m = modes(S.cur, to).out.filter((o) => !o.closed); const o = prefs.map((k) => m.find((x) => x.k === k)).find(Boolean); if (o && S.cash >= o.m) travel(to, o.k); else acts--; });
const nearestHub = () => [...HUB].map((i) => CITY[i]).filter((c) => inSA(c)).sort((a, b) => dist(a, CITY[S.cur]) - dist(b, CITY[S.cur]))[0].id;
const exitTo = () => S.buyer || 'madrid';

const STRATS = {
  // Bus al aeropuerto más cercano y vuelo directo con documento real
  directo() {
    if (S.crime === 'joyas') while (S.lots > 0 && !S.over) A(sellLot)();
    const h = nearestHub(); if (h !== S.cur) go(h, ['bus', 'air']);
    go(exitTo(), ['air']);
  },
  // Igual, pero comprando pasaporte falso antes de volar
  falso() {
    if (S.crime === 'joyas') while (S.lots > 0 && !S.over) A(sellLot)();
    const h = nearestHub(); if (h !== S.cur) go(h, ['bus', 'air']);
    A(forge)();
    if (S.awake > 12) A(rest)('hostal');
    go(exitTo(), ['air']);
  },
  // Pasaporte falso + disfraz + descansar antes de volar
  cuidadoso() {
    if (S.crime === 'joyas') while (S.lots > 0 && !S.over) A(sellLot)();
    const h = nearestHub(); if (h !== S.cur) go(h, ['bus', 'air']);
    A(forge)(); A(disguise)();
    A(rest)('hostal');
    go(exitTo(), ['air']);
  },
};

window.runSim = (n = 120) => {
  const out = {};
  for (const name in STRATS) for (const cr of ['camion', 'joyas', 'arte']) {
    let w = 0, a = 0, h = 0, why = {};
    for (let i = 0; i < n; i++) {
      setS(newGame(cr)); acts = 0;
      try { STRATS[name](); } catch (e) { why['error ' + e.message] = (why['error ' + e.message] || 0) + 1; }
      if (S.over && S.over.win) { w++; a += acts; h += S.hours; }
      else { const k = S.over ? S.over.msg.slice(0, 34) : 'sin terminar en ' + CITY[S.cur].n; why[k] = (why[k] || 0) + 1; }
    }
    out[`${name}/${cr}`] = { gana: Math.round((w / n) * 100) + '%', acciones: w ? (a / w).toFixed(1) : '-', horas: w ? Math.round(h / w) : '-', pierde: Object.entries(why).sort((x, y) => y[1] - x[1]).slice(0, 2) };
  }
  return out;
};
