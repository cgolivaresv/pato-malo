// Planificación y ejecución del golpe. El plan cambia cómo empieza la fuga:
// botín, horas antes de la alarma, calor inicial, rastros y desde qué ciudad partes.
import { CRIMES, PLAN } from '../data/content.js';
import { CITIES, CITY } from '../data/geo.js';
import { R, pick, dist } from '../lib/util.js';
import { skill } from './career.js';

export const BASE_CLEAN = [0, 0.62, 0.55, 0.47, 0.4, 0.32];
export const SAPO = 0.08; // probabilidad de que cada integrante del equipo caiga y hable

export const defaultPlan = () => ({ recon: 'dia', crew: [], hora: 'noche', tools: [], salida: 'pie' });

const step = (id) => PLAN.find((p) => p.id === id);
const opt = (sid, oid) => step(sid).opts.find((o) => o.id === oid);
// Todas las opciones elegidas, como lista
export function chosen(plan) {
  const out = [];
  for (const s of PLAN) {
    const v = plan[s.id];
    for (const id of s.multi ? v : [v]) { const o = opt(s.id, id); if (o) out.push(o); }
  }
  return out;
}
export const has = (plan, sid, oid) => (Array.isArray(plan[sid]) ? plan[sid].includes(oid) : plan[sid] === oid);
// El costo de las opciones sube con el tamaño del botín
export const costK = (cr) => Math.max(0.3, Math.min(4, cr.cash / 1.5e6));
export const optCost = (cr, o) => Math.round(((o.cost || 0) * costK(cr)) / 1000) * 1000;

// Probabilidades del resultado
export function odds(cr, plan) {
  let clean = BASE_CLEAN[cr.lvl] + chosen(plan).reduce((a, o) => a + (o.clean || 0), 0) + 0.04 * skill('sigilo');
  clean = Math.max(0.05, Math.min(0.92, clean));
  let share = 0.3 + 0.05 * cr.lvl;
  if (has(plan, 'tools', 'inhibidor')) share *= 0.5;
  if (has(plan, 'recon', 'semana')) share *= 0.8;
  const alarm = (1 - clean) * share;
  return { clean, witness: 1 - clean - alarm, alarm };
}

// Plata y botín con que sales, antes del resultado
export function budget(cr, plan) {
  const os = chosen(plan);
  const cut = os.reduce((a, o) => a + (o.cut || 0), 0);
  const mul = (opt('hora', plan.hora).loot || 1) * (1 + 0.1 * skill('manos')) * (1 - cut);
  const cost = os.reduce((a, o) => a + optCost(cr, o), 0);
  const cash = Math.round((cr.cash * mul - cost) / 1000) * 1000;
  return { cut, mul, cost, cash, ok: cash >= 150000 };
}

// Horas antes de que suene la alarma si sale limpio
export function alarmHours(cr, plan) {
  return cr.alarm + (plan.crew.includes('hacker') ? 2 : 0) + (plan.hora === 'partido' ? 1 : 0) + (plan.tools.includes('inhibidor') ? 1 : 0);
}

// Ejecuta el golpe. Devuelve todo lo que necesita newGame para armar el inicio de la fuga.
export function execute(id, plan = defaultPlan()) {
  const base = CRIMES.find((c) => c.id === id);
  const o = odds(base, plan), b = budget(base, plan);
  const r = R();
  const outcome = r < o.clean ? 'clean' : r < o.clean + o.witness ? 'witness' : 'alarm';
  const start = base.city ? CITY[base.city] : pick(CITIES.filter((c) => c.c === 'CL' && !c.air));
  const cr = { ...base, lot: { ...base.lot } };
  const manos = 1 + 0.1 * skill('manos');
  cr.cash = b.cash;
  if (cr.lootVal) cr.lootVal = Math.round(cr.lootVal * b.mul);
  if (cr.lot.val) cr.lot.val = Math.round(cr.lot.val * manos);
  cr.alarm = alarmHours(base, plan);
  let heat = base.heat + (plan.hora === 'dia' ? 10 : 0) - (plan.tools.includes('guantes') ? 5 : 0) - (plan.tools.includes('mascara') ? 5 : 0);
  const traces = [];
  const notes = [];
  if (outcome === 'witness') {
    cr.alarm = Math.max(0.5, cr.alarm - 1);
    heat += 10;
    traces.push({ city: start.id, at: cr.alarm + 2, txt: `Un testigo describe en ${start.n} a un pato con gorra y lentes oscuros. La PDI ya tiene un retrato hablado.` });
    notes.push('Un testigo te vio la cara: la alarma sonará antes y sales con más calor.');
  }
  if (outcome === 'alarm') {
    cr.alarm = 0.25;
    heat += 20;
    cr.cash = Math.max(150000, Math.round((cr.cash * 0.6) / 1000) * 1000);
    if (cr.lootVal) cr.lootVal = Math.round(cr.lootVal * 0.6);
    notes.push('La alarma saltó cuando ibas saliendo: tuviste que dejar parte del botín y la PDI viene en minutos.');
  }
  // El equipo puede caer y hablar
  const ROLE = { chofer: 'tu chofer', hacker: 'tu hacker', campana: 'tu campana' };
  for (const m of plan.crew) {
    if (R() < SAPO) traces.push({ city: start.id, at: 14 + R() * 16, txt: `Detuvieron a ${ROLE[m]} en ${start.n} y habló. La PDI sabe hacia dónde arrancaste.` });
  }
  // Escape del lugar
  let cur = start, hours = 0;
  if (plan.salida === 'moto' || plan.salida === 'auto') {
    const [lo, hi] = plan.salida === 'moto' ? [100, 330] : [280, 650];
    const opts = CITIES.filter((c) => c.c === 'CL' && !c.air && c.id !== start.id && dist(c, start) >= lo && dist(c, start) <= hi);
    if (opts.length) {
      cur = pick(opts);
      hours = plan.salida === 'moto' ? 2 + dist(cur, start) / 160 : 1 + dist(cur, start) / 110;
      if (plan.salida === 'auto') traces.push({ city: cur.id, at: hours + 8 + R() * 6, txt: `Encuentran en ${cur.n} el auto del golpe, abandonado y con las llaves puestas.` });
    }
  }
  return {
    cr, outcome, odds: o, start: start.id, cur: cur.id, hours, heat, traces, notes,
    t0: opt('hora', plan.hora).t0 ?? 22,
    soplonUntil: plan.crew.includes('campana') ? hours + 12 : -1,
    disguiseUntil: plan.tools.includes('repartidor') ? hours + 24 : -1,
    plan,
  };
}
