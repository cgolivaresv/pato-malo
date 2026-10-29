// Planificación y ejecución del golpe. El plan cambia cómo empieza la fuga:
// botín, horas antes de la alarma, calor inicial, rastros y desde qué ciudad partes.
import { CRIMES, PLAN } from '../data/content.js';
import { CITIES, CITY } from '../data/geo.js';
import { R, pick, dist, shuffle } from '../lib/util.js';
import { skill } from './career.js';
import { CITY_FLAVOR, CREW, DAY_EVENTS, CONTRACTS, CAPOS, PREP, TOOLS, VEHICLES, PLAN_B_COST, Capo } from '../data/heistdata.js';
import { generate, summary } from './board.js';
import { crewInfo, cityCount } from './career.js';

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

// =====================================================================
// Golpe táctico: preparación y paso al plano (board.js)
// =====================================================================

const hourOfDay = (h) => h % 24;
const weighted = (list) => { const t = list.reduce((a, x) => a + (x.w || 1), 0); let r = R() * t; for (const x of list) { r -= x.w || 1; if (r <= 0) return x; } return list[0]; };

// Nueva preparación: ciudad al azar, imprevisto del día, encargo y equipo disponible
export function newPrep(id) {
  const cr = CRIMES.find((c) => c.id === id);
  const city = pick(Object.keys(CITY_FLAVOR));
  const fl = CITY_FLAVOR[city];
  let ev = weighted(DAY_EVENTS);
  if (fl.rain && R() < fl.rain) ev = DAY_EVENTS.find((e) => e.id === 'lluvia');
  const contract = R() < 0.75 ? { ...pick(CONTRACTS), capo: pick(CAPOS) } : null;
  const offer = {};
  for (const role of ['chofer', 'hacker', 'campana']) {
    const free = CREW.filter((m) => m.role === role && !crewInfo(m.id).jail);
    offer[role] = shuffle(free).slice(0, 2).map((m) => m.id);
  }
  return {
    id, cr, city, event: ev.id, contract, contractOn: false, offer,
    crew: { chofer: null, hacker: null, campana: null }, prep: new Set(), tools: { ganzua: 0, esmeril: 0, inhibidor: 0 },
    vehicle: null, planB: false, memory: Math.min(3, cityCount(city)),
  };
}

// Integrante con sus mejoras de veterano (cada nivel: -2% de parte y -3% de sapear)
export function member(id) {
  const m = CREW.find((c) => c.id === id);
  if (!m) return null;
  const info = crewInfo(id), lv = info.lvl || 1;
  return { ...m, lvl: lv, runs: info.runs || 0, cut: Math.max(0.03, m.cut - 0.02 * (lv - 1)), sapo: Math.max(0.01, m.sapo - 0.03 * (lv - 1)) };
}
export const crewOf = (P) => Object.fromEntries(Object.entries(P.crew).map(([r, id]) => [r, id ? member(id) : null]));

export function prepCost(P) {
  const k = costK(P.cr);
  let c = 0;
  for (const p of PREP) if (P.prep.has(p.id)) c += p.cost * k;
  for (const [t, n] of Object.entries(P.tools)) c += TOOLS[t].cost * n;
  if (P.vehicle === 'moto') c += VEHICLES.moto.cost;
  if (P.planB) c += PLAN_B_COST;
  return Math.round(c / 1000) * 1000;
}
export const prepItemCost = (P, p) => Math.round((p.cost * costK(P.cr)) / 1000) * 1000;
export const crewCut = (P) => Object.values(crewOf(P)).filter(Boolean).reduce((a, m) => a + m.cut, 0);
// Sospecha: cada preparativo y cada integrante hace que McCuack escuche algo
export function suspicion(P) {
  let s = P.memory * 10;
  for (const p of PREP) if (P.prep.has(p.id)) s += p.sus;
  s += Object.values(P.crew).filter(Boolean).length * 4;
  s += P.susExtra || 0; // vigilar, cavar, dormirse en la calle, toparse con McCuack
  return Math.min(100, s);
}
export const mccChance = (P) => Math.max(0, (suspicion(P) - 30) / 100) * 1.4;

// Arranca el plano. Puede derrumbarse el túnel o aparecer McCuack de civil.
export function startBoard(P, mcc) {
  const notes = [];
  let tunnelCollapsed = false;
  if (P.prep.has('tunel') && !P.noCollapseRoll && R() < PREP.find((p) => p.id === 'tunel').collapse) { tunnelCollapsed = true; notes.push('El túnel se derrumbó la última noche: perdiste lo que pagaste y hay que entrar por arriba.'); }
  const cfg = {
    cr: P.cr, city: P.city, tier: P.cr.lvl, event: P.event, prep: P.prep, crew: crewOf(P), tools: Object.fromEntries(Object.entries(P.tools).map(([k, n]) => [k, n * TOOLS[k].uses])),
    contract: P.contractOn ? P.contract : null, memory: P.memory, vehicle: P.vehicle, planB: P.planB, mcc, tunnelCollapsed,
    recon: P.recon || 0, daytime: P.golpeAt != null && hourOfDay(P.golpeAt) >= 8 && hourOfDay(P.golpeAt) < 20,
  };
  const H = generate(cfg);
  H.notes = notes;
  return H;
}

export function contractOk(P, s) {
  const c = P.contract;
  if (!c) return false;
  return { sinAlarma: !s.alarm, sinCamaras: !s.recorded, reloj: s.reloj, rapido: s.turns <= s.rapidT, sinForzar: s.forced === 0, todo: s.share >= 0.7 }[c.id];
}
export const contractText = (P) => (P.contract ? P.contract.d.replace('{T}', 30 + 6 * P.cr.lvl) : '');

// Del plano a la fuga: el mismo formato que execute()
export function toSetup(P, H) {
  const s = summary(H);
  const base = P.cr, crew = crewOf(P), cut = crewCut(P);
  const cr = { ...base, lot: { ...base.lot } };
  const manos = 1 + 0.1 * skill('manos');
  const notes = [...(H.notes || [])];
  const ok = P.contractOn && contractOk(P, s);
  let cash = s.cash * (1 - cut) * manos - prepCost(P);
  if (ok) { cash += base.cash * 0.25; notes.push(`Encargo cumplido: ${P.contract.capo} te pagó ${Math.round((base.cash * 0.25) / 1000)} mil extra.`); }
  cr.cash = Math.max(80000, Math.round(cash / 1000) * 1000);
  if (base.kind === 'goods') { cr.lootVal = Math.round(s.goodsVal * (1 - cut) * manos); cr.lot.count = Math.max(1, s.goodsN); }
  if (cr.lot.val) cr.lot.val = Math.round(cr.lot.val * manos);
  const start = CITY[P.city];
  cr.alarm = s.outcome === 'alarm' ? 0.25 : s.outcome === 'witness' ? Math.max(0.5, base.alarm - 1) : base.alarm + (P.prep.has('llamada') ? 1 : 0);
  const heat = base.heat + (s.recorded ? 8 : 0) + (s.seen ? 8 : 0) + (s.alarm ? 15 : 0) + (s.mccSaw ? 10 : 0) + P.memory * 5;
  const traces = [];
  if (s.recorded && !s.alarm) traces.push({ city: start.id, at: cr.alarm + 3, txt: `Las cámaras del golpe en ${start.n} muestran a un pato con gorra y lentes oscuros.` });
  if (s.mccSaw) traces.push({ city: start.id, at: cr.alarm + 1, txt: `McCuack recuerda al pato que vio rondando en ${start.n} el día del golpe.` });
  // El equipo puede caer y hablar; los que caen quedan presos
  const fallen = [];
  for (const m of Object.values(crew).filter(Boolean)) {
    if (R() < m.sapo) { fallen.push(m.id); traces.push({ city: start.id, at: 10 + R() * 18, txt: `Detuvieron a ${m.n} en ${start.n} y habló. La PDI sabe hacia dónde arrancaste.` }); }
  }
  for (const p of PREP) if (P.prep.has(p.id) && p.sapo && R() < p.sapo) traces.push({ city: start.id, at: 12 + R() * 16, txt: `${p.id === 'conserje' ? 'El conserje' : 'El guardia sobornado'} de ${start.n} se arrepintió y contó todo.` });
  if (P.contractOn && !ok && R() < 0.3) traces.push({ city: start.id, at: 16 + R() * 12, txt: `${Capo(P.contract.capo)}, molesto por el encargo fallido, le pasó un dato a la PDI.` });
  // Integrantes presos de golpes anteriores pueden sapearte
  for (const m of CREW) { const inf = crewInfo(m.id); if (inf.jail && R() < 0.1) traces.push({ city: start.id, at: 20 + R() * 20, txt: `Desde la cárcel, ${m.n} le contó a la PDI cómo trabaja Pato Malo.` }); }
  // Salida del lugar
  let cur = start, hours = 0;
  const ex = s.exit;
  if (ex === 'auto' || ex === 'moto') {
    const far = ex === 'auto' ? (crew.chofer && crew.chofer.far ? [400, 800] : [280, 650]) : [100, 330];
    const opts = CITIES.filter((c) => c.c === 'CL' && !c.air && c.id !== start.id && dist(c, start) >= far[0] && dist(c, start) <= far[1]);
    if (opts.length) {
      cur = pick(opts);
      hours = ex === 'moto' ? 2 + dist(cur, start) / 160 : 1 + dist(cur, start) / 110;
      if (ex === 'auto' && R() < 0.5) traces.push({ city: cur.id, at: hours + 8 + R() * 6, txt: `Encuentran en ${cur.n} el auto del golpe, abandonado y con las llaves puestas.` });
    }
  }
  return {
    cr, outcome: s.outcome, odds: null, start: start.id, cur: cur.id, hours, heat, traces, notes,
    t0: P.golpeAt != null ? P.golpeAt : P.event === 'partido' ? 21 : 22, soplonUntil: crew.campana ? hours + 12 : -1, disguiseUntil: -1,
    plan: null, summary: s, contract: P.contractOn ? { ...P.contract, ok } : null, fallen,
    crewIds: Object.values(P.crew).filter(Boolean), city: P.city,
  };
}
