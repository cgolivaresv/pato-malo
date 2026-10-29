// Preparación del golpe en un mapa simulado de la ciudad. Pato camina entre lugares;
// cada cuadra y cada acción gastan horas del reloj hasta la noche del golpe.
// Trabaja sobre la preparación P de heist.js (equipo, preparativos, herramientas, vehículo).
import { CITY } from '../data/geo.js';
import { R, pick, shuffle } from '../lib/util.js';
import { PREP, TOOLS, VEHICLES, PLAN_B_COST, CITY_FLAVOR, deCapo } from '../data/heistdata.js';
import { member, prepItemCost } from './heist.js';

export const START_H = 9; // lunes 09:00 (horas desde el lunes a las 00:00)
export const DEADLINE_H = 71; // miércoles 23:00
export const BLOCK_H = 0.2; // 12 minutos por cuadra
export const GW = 7, GH = 9; // esquinas del mapa
const AWAKE_MAX = 20;
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const clockTxt = (h) => `${DAYS[Math.floor(h / 24) % 7].slice(0, 3)} ${String(Math.floor(h % 24)).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
export const hourOf = (h) => h % 24;

const TARGET = {
  lanzazo: ['El puesto de celulares', '🏪'], bencina: ['La bomba de bencina', '⛽'], cambio: ['La casa de cambio', '💱'],
  camion: ['La sucursal bancaria', '🏦'], joyas: ['La joyería', '💍'], arte: ['El museo', '🖼️'], casino: ['El casino', '🎰'], boveda: ['El banco', '🏦'],
};

// Lugares. open: [desde, hasta) en horas del día; sin open, siempre abierto.
export function placesFor(P) {
  const [tn, ti] = TARGET[P.id] || ['El objetivo', '🎯'];
  const list = [
    { id: 'guarida', n: 'Tu pieza', icon: '🏚️', d: 'Una pieza arrendada en un pasaje. Aquí duermes tranquilo.' },
    { id: 'objetivo', n: tn, icon: ti, d: 'El lugar del golpe. Vigilarlo te muestra el plano por dentro.' },
    { id: 'alcantarilla', n: 'Alcantarilla', icon: '🕳️', d: 'Da a los colectores bajo el objetivo. Solo se puede cavar de noche.' },
    { id: 'obras', n: 'Dirección de Obras', icon: '📐', d: 'Aquí están los planos de cada edificio de la ciudad.', open: [9, 18] },
    { id: 'agencia', n: 'Agencia de aseo', icon: '🧹', d: 'Buscan aseadores para el objetivo. Pagan poco y no preguntan.', open: [8, 18] },
    { id: 'taller', n: 'Taller mecánico', icon: '🔧', d: 'Choferes que no hacen preguntas, y motos sin papeles.', open: [8, 20] },
    { id: 'ciber', n: 'Cibercafé', icon: '💻', d: 'Donde se juntan los hackers del barrio.', open: [10, 24] },
    { id: 'feria', n: 'La feria', icon: '🧺', d: 'Entre los puestos están los mejores campanas.', open: [7, 15] },
    { id: 'ferreteria', n: 'Ferretería', icon: '🔩', d: 'Ganzúas «para cerrajeros» y esmeriles.', open: [9, 20] },
    { id: 'persa', n: 'El persa', icon: '🛍️', d: 'Hay de todo, hasta inhibidores de señal.', open: [10, 20] },
    { id: 'cabina', n: 'Teléfono público', icon: '☎️', d: 'Uno de los últimos que quedan. No deja registro.' },
  ];
  if (P.contract) list.push({ id: 'capo', n: `Casa ${deCapo(P.contract.capo)}`, icon: '🎩', d: 'El capo que te ofrece un encargo.' });
  return list;
}

// Arma el mapa: lugares en esquinas distintas, la guarida lejos del objetivo y la alcantarilla al lado
export function setupMap(P) {
  const places = placesFor(P);
  const cells = [];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) cells.push({ x, y });
  const pos = {};
  const used = new Set();
  const take = (c) => { pos[c.id] = { x: c.x, y: c.y }; used.add(`${c.x},${c.y}`); };
  const tgt = pick(cells.filter((c) => c.x >= 2 && c.x <= GW - 3 && c.y >= 2 && c.y <= GH - 3));
  take({ id: 'objetivo', ...tgt });
  const sew = pick(cells.filter((c) => Math.abs(c.x - tgt.x) + Math.abs(c.y - tgt.y) === 1));
  take({ id: 'alcantarilla', ...sew });
  const far = cells.filter((c) => Math.abs(c.x - tgt.x) + Math.abs(c.y - tgt.y) >= 6 && !used.has(`${c.x},${c.y}`));
  take({ id: 'guarida', ...pick(far) });
  const free = shuffle(cells.filter((c) => !used.has(`${c.x},${c.y}`)));
  // Que los lugares no queden pegados entre sí
  for (const p of places) {
    if (pos[p.id]) continue;
    const c = free.find((q) => !used.has(`${q.x},${q.y}`) && Object.values(pos).every((o) => Math.abs(o.x - q.x) + Math.abs(o.y - q.y) >= 2)) || free.find((q) => !used.has(`${q.x},${q.y}`));
    take({ id: p.id, ...c });
  }
  const fl = CITY_FLAVOR[P.city] || {};
  Object.assign(P, {
    places, pos, at: 'guarida', clock: START_H, awake: 1, recon: 0, watchN: 0, tunnelNights: 0, susExtra: 0,
    mcc: null, mccSeen: false, mapLog: [], golpeAt: null, noCollapseRoll: true,
    look: { sea: CITY[P.city].coast ? 1 : 0, river: ['santiago', 'concepcion', 'talca'].includes(P.city), hills: P.city === 'valparaiso', rain: fl.rain },
  });
  log(P, `Llegaste a ${CITY[P.city].n}. El golpe es el ${clockTxt(DEADLINE_H).replace(/^(\w+)/, (m) => m.toLowerCase())}: hasta entonces, prepáralo.`);
}

export const log = (P, t, cls = '') => { P.mapLog.push({ t, cls, at: P.clock }); if (P.mapLog.length > 30) P.mapLog.shift(); };
export const placeOf = (P, id) => P.places.find((p) => p.id === id);
export const isOpen = (p, h) => { if (!p.open) return true; const x = hourOf(h); return x >= p.open[0] && x < p.open[1]; };
export const timeLeft = (P) => Math.max(0, DEADLINE_H - P.clock);

// Camino por las calles: primero en x, después en y
export function route(P, toId) {
  const a = P.pos[P.at], b = P.pos[toId], pts = [{ ...a }];
  let { x, y } = a;
  while (x !== b.x) { x += Math.sign(b.x - x); pts.push({ x, y }); }
  while (y !== b.y) { y += Math.sign(b.y - y); pts.push({ x, y }); }
  return pts;
}
export const walkH = (P, toId) => (route(P, toId).length - 1) * BLOCK_H;

const night = (h) => { const x = hourOf(h); return x >= 22 || x < 6; };
const day = (h) => { const x = hourOf(h); return x >= 8 && x < 20; };

// Acciones de un lugar. Cada una: { id, n, d, h (horas), cost, sus, off (motivo si no se puede) }
export function placeActions(P, id) {
  const p = placeOf(P, id), out = [];
  const tc = (pid) => prepItemCost(P, PREP.find((x) => x.id === pid));
  const has = (pid) => P.prep.has(pid);
  const at = P.clock + (P.at === id ? 0 : walkH(P, id));
  const closed = !isOpen(p, at) ? `Abre de ${String(p.open[0]).padStart(2, '0')}:00 a ${String(p.open[1] % 24).padStart(2, '0')}:00` : '';
  const add = (a) => out.push({ off: '', ...a });
  switch (id) {
    case 'guarida': add({ id: 'dormir', n: 'Dormir', d: 'Recuperas energía.', h: 8 }); break;
    case 'objetivo':
      add({ id: 'vigilar', n: 'Vigilar desde la vereda de enfrente', d: P.recon >= 4 ? 'Ya conoces todo el lugar.' : `Anotas una pieza más del plano (${P.recon}/4). Mientras más vigilas, más se nota.`, h: 3, sus: 4 + 2 * P.watchN, off: P.recon >= 4 ? 'Ya lo conoces entero' : '' });
      add({ id: 'conserje', n: 'Sobornar al conserje', d: PREP.find((x) => x.id === 'conserje').d, h: 1, cost: tc('conserje'), sus: 15, off: has('conserje') ? 'Ya está sobornado' : !day(at) ? 'El conserje trabaja de 08:00 a 20:00' : '' });
      add({ id: 'guardia', n: 'Sobornar al guardia de noche', d: PREP.find((x) => x.id === 'guardia').d, h: 1, cost: tc('guardia'), sus: 15, off: has('guardia') ? 'Ya está sobornado' : day(at) ? 'El guardia de noche llega a las 20:00' : '' });
      add({ id: 'golpe', n: '¡Dar el golpe ahora!', d: day(at) ? 'De día hay más plata en caja, pero un guardia más.' : 'De noche: menos gente en la calle.', h: 0, primary: true });
      break;
    case 'alcantarilla': {
      const need = 2 - P.tunnelNights;
      add({ id: 'cavar', n: has('tunel') ? 'El túnel está listo' : `Cavar el túnel (noche ${P.tunnelNights + 1} de 2)`, d: 'Seis horas de pala bajo tierra. Puede derrumbarse.', h: 6, cost: Math.round(tc('tunel') / 2000) * 1000, sus: 8, off: has('tunel') ? 'Ya está listo' : !night(at) ? 'Solo se puede cavar de noche (22:00 a 06:00)' : need <= 0 ? 'Listo' : '' });
      break;
    }
    case 'obras': add({ id: 'planos', n: 'Comprar los planos', d: PREP.find((x) => x.id === 'planos').d, h: 2, cost: tc('planos'), sus: 10, off: has('planos') ? 'Ya los tienes' : closed }); break;
    case 'agencia': add({ id: 'infiltracion', n: 'Trabajar dos turnos de aseador', d: PREP.find((x) => x.id === 'infiltracion').d, h: 16, sus: 25, off: has('infiltracion') ? 'Ya tienes el uniforme' : closed }); break;
    case 'taller':
    case 'ciber':
    case 'feria': {
      const role = { taller: 'chofer', ciber: 'hacker', feria: 'campana' }[id];
      for (const mid of P.offer[role]) {
        const m = member(mid), hired = P.crew[role] === mid;
        add({ id: hired ? 'despedir' : 'contratar', arg: `${role}:${mid}`, n: hired ? `Despedir a ${m.n}` : `Contratar a ${m.n}`, d: `${m.d} Se lleva ${Math.round(m.cut * 100)}% del botín; sapea ${Math.round(m.sapo * 100)}%.${m.runs ? ` Veterano nv. ${m.lvl}.` : ''}`, h: hired ? 0 : 1, sus: hired ? 0 : 4, off: hired ? '' : closed || (P.crew[role] ? `Ya tienes ${role}` : '') });
      }
      if (id === 'taller') {
        add({ id: 'moto', n: P.vehicle === 'moto' ? 'Ya tienes la moto' : 'Comprar una moto', d: VEHICLES.moto.d, h: 0.5, cost: VEHICLES.moto.cost, off: P.vehicle ? 'Ya tienes vehículo' : closed });
        if (P.crew.chofer && P.vehicle !== 'auto') add({ id: 'auto', n: 'Que el chofer prepare su auto', d: VEHICLES.auto.d, h: 0.5, off: P.vehicle === 'moto' ? 'Ya tienes la moto' : closed });
        add({ id: 'planB', n: 'Una moto extra para el plan B', d: 'La dejas en otra esquina por si una patrulla bloquea tu vehículo.', h: 0.5, cost: PLAN_B_COST, off: P.planB ? 'Ya está' : !P.vehicle ? 'Primero consigue un vehículo' : closed });
      }
      break;
    }
    case 'ferreteria':
      for (const k of ['ganzua', 'esmeril']) add({ id: 'tool', arg: k, n: `Comprar ${TOOLS[k].n.toLowerCase()} (tienes ${P.tools[k]})`, d: `${TOOLS[k].d} ${TOOLS[k].uses} usos.`, h: 0.25, cost: TOOLS[k].cost, off: P.tools[k] >= 2 ? 'Ya tienes dos' : closed });
      break;
    case 'persa': add({ id: 'tool', arg: 'inhibidor', n: `Comprar un inhibidor (tienes ${P.tools.inhibidor})`, d: TOOLS.inhibidor.d, h: 0.5, cost: TOOLS.inhibidor.cost, off: P.tools.inhibidor >= 2 ? 'Ya tienes dos' : closed }); break;
    case 'cabina': add({ id: 'llamada', n: 'Dejar lista la llamada falsa a Carabineros', d: PREP.find((x) => x.id === 'llamada').d, h: 0.5, cost: tc('llamada'), sus: 10, off: has('llamada') ? 'Ya está lista' : '' }); break;
    case 'capo': add({ id: 'encargo', n: P.contractOn ? 'Encargo aceptado' : 'Aceptar el encargo', d: P.contract ? P.contract.d.replace('{T}', 30 + 6 * P.cr.lvl) : '', h: 1, off: P.contractOn ? 'Ya lo aceptaste' : '' }); break;
    default: break;
  }
  if (timeLeft(P) <= 0) for (const a of out) if (a.id !== 'golpe') a.off = a.off || 'Ya es la hora del golpe';
  return out;
}

// Pasa el tiempo: cansancio y McCuack recorriendo la ciudad cuando sospecha
function pass(P, h) {
  P.clock += h;
  P.awake += h;
}
export function suspicionNow(P, base) { return Math.min(100, base + P.susExtra); }

function mccStep(P, sus) {
  if (sus < 40 && !P.mcc) return;
  const ids = P.places.map((p) => p.id).filter((i) => i !== 'guarida');
  const was = !P.mcc;
  P.mcc = pick(ids.filter((i) => !P.mcc || i !== P.mcc));
  if (was) log(P, 'Tanto movimiento llamó la atención: McCuack anda de civil por la ciudad, haciendo preguntas.', 'warn');
}
function mccCheck(P) {
  if (P.mcc && P.mcc === P.at && !P.mccSeen) {
    P.mccSeen = true; P.susExtra += 10;
    log(P, `McCuack estaba en ${placeOf(P, P.at).n} y te miró de arriba abajo. Va a estar rondando el día del golpe.`, 'bad');
  }
}

// Camina hasta un lugar
export function walkTo(P, id) {
  if (P.at === id) return;
  const h = walkH(P, id);
  pass(P, h);
  P.at = id;
  mccCheck(P);
}

// Hace una acción donde estás. sus: sospecha base actual (de heist.js) para mover a McCuack.
export function doAction(P, a, sus) {
  const id = a.id;
  pass(P, a.h);
  if (a.sus) P.susExtra += 0; // la sospecha de preparativos y equipo ya la cuenta heist.js
  switch (id) {
    case 'dormir': P.awake = 0; log(P, 'Dormiste ocho horas en tu pieza.'); break;
    case 'vigilar': P.recon = Math.min(4, P.recon + 1); P.susExtra += 4 + 2 * P.watchN; P.watchN++; log(P, `Vigilaste el objetivo: ya conoces ${P.recon} de 4 partes del plano.`, 'good'); break;
    case 'conserje': P.prep.add('conserje'); log(P, 'El conserje aceptó: la puerta de atrás va a quedar abierta.', 'good'); break;
    case 'guardia': P.prep.add('guardia'); log(P, 'Un guardia va a mirar para otro lado.', 'good'); break;
    case 'cavar': {
      P.susExtra += 8;
      if (R() < 0.12) { P.tunnelNights = 0; P.sunk = (P.sunk || 0) + a.cost; log(P, 'El túnel se derrumbó. Hay que empezar de nuevo.', 'bad'); break; }
      P.sunk = (P.sunk || 0) + a.cost;
      P.tunnelNights++;
      if (P.tunnelNights >= 2) { P.prep.add('tunel'); P.sunk -= a.cost * 2; log(P, 'El túnel llegó justo bajo la bóveda.', 'good'); } else log(P, 'Una noche cavando. Falta otra.');
      break;
    }
    case 'planos': P.prep.add('planos'); log(P, 'Tienes los planos completos del objetivo.', 'good'); break;
    case 'infiltracion': P.prep.add('infiltracion'); log(P, 'Dos turnos de aseador: ya tienes uniforme y llave de la bodega.', 'good'); break;
    case 'contratar': { const [role, mid] = a.arg.split(':'); P.crew[role] = mid; log(P, `${member(mid).n} se suma al golpe.`, 'good'); break; }
    case 'despedir': { const [role] = a.arg.split(':'); const m = member(P.crew[role]); P.crew[role] = null; if (role === 'chofer' && P.vehicle === 'auto') P.vehicle = null; log(P, `${m.n} queda fuera del golpe.`); break; }
    case 'moto': P.vehicle = 'moto'; log(P, 'Compraste una moto sin papeles.', 'good'); break;
    case 'auto': P.vehicle = 'auto'; log(P, 'El chofer tiene su auto listo para la huida.', 'good'); break;
    case 'planB': P.planB = true; log(P, 'La moto del plan B queda en otra esquina.', 'good'); break;
    case 'tool': P.tools[a.arg]++; log(P, `Compraste ${TOOLS[a.arg].n.toLowerCase()}.`, 'good'); break;
    case 'llamada': P.prep.add('llamada'); log(P, 'La llamada falsa está lista para cuando empiece el golpe.', 'good'); break;
    case 'encargo': P.contractOn = true; log(P, `Aceptaste el encargo de ${P.contract.capo}.`, 'good'); break;
    default: break;
  }
  mccStep(P, sus);
  mccCheck(P);
  // Cansancio: con demasiadas horas despierto, te duermes donde estés
  if (P.awake >= AWAKE_MAX && id !== 'golpe') {
    pass(P, 8); P.awake = 0;
    if (P.at !== 'guarida') { P.susExtra += 5; log(P, `Te quedaste dormido en ${placeOf(P, P.at).n}. Ocho horas perdidas y alguien te vio.`, 'warn'); }
    else log(P, 'Caíste rendido en tu pieza: ocho horas de sueño.', 'warn');
  }
}

export const isDay = (h) => day(h);
