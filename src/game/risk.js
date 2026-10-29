// Riesgos de los controles y opciones de transporte, con la geografía real del cono sur.
import { CITY, HUB, BORDER, TRAINS, inSA, airport, intlAirport } from '../data/geo.js';
import { clamp01, dist } from '../lib/util.js';
import { S, disguised, interpol } from './state.js';
import { checkAt, inZone, zoneDensity } from './pursuit.js';

const fakeOk = () => S.id === 'fake' && !S.idBurnSecret;
// Escala general de los controles en viajes (balance)
export const CONTROL_SCALE = 0.6;

// Probabilidad de que te detengan en un control de identidad
export function idRisk(kind, from, to) {
  const intl = from.c !== to.c, alertC = (S.alert[from.c] || -1) > S.hours;
  let p = 0;
  if (fakeOk()) {
    p = (intl ? 0.045 : 0.025) + S.heat / 750;
    if (S.passQ === 'top') p *= 0.5;
    if (interpol()) p *= 1.4;
  } else {
    p = (intl ? 0.17 : 0.04) + S.heat / (intl ? 220 : 400);
    if (interpol()) p = p * 2.4 + 0.08;
  }
  // Bus dentro del país: no piden documento; solo hay cámaras y alguna patrulla
  const domBus = kind === 'bus' && !intl;
  if (domBus) p = S.heat / 2000;
  // Alerta en el país: revisan más, sobre todo a quien viaja con su documento real
  if (alertC) p += domBus ? 0.015 : fakeOk() ? 0.025 : 0.07;
  // La brigada en tu ciudad vigila sobre todo el aeropuerto
  if (S.police.city === from.id && S.police.arrive == null) p += domBus ? 0.08 : 0.18;
  // Controles de McCuack en la ciudad de salida o de llegada: revisan documentos a todos
  if (kind !== 'paso' && (checkAt(from.id) || checkAt(to.id))) p += fakeOk() ? (S.passQ === 'top' ? 0.015 : 0.04) : 0.12;
  // Dentro de la zona de búsqueda hay más patrullas
  if (kind !== 'paso' && inZone(from)) p += (domBus ? 0.02 : 0.05) * zoneDensity();
  if (disguised()) p *= 0.6;
  if (S.perks.quiltro) p *= 0.85;
  if (S.perks.press && kind !== 'paso') p *= 0.5;
  if (S.hours < S.perks.chaosUntil) p *= 0.3;
  return clamp01(p * CONTROL_SCALE);
}

// Migraciones al aterrizar fuera de Sudamérica: depende del documento con que viajas
export function exitRisk() {
  const real = S.id === 'real' || S.idBurnSecret;
  let p;
  if (real) p = 0.75 + S.heat / 200 + (interpol() ? 0.15 : 0);
  else if (S.passQ === 'top') p = 0.04 + S.heat / 500 + (interpol() ? 0.04 : 0);
  else p = 0.6 + S.heat / 200 + (interpol() ? 0.12 : 0);
  if (disguised()) p *= 0.8;
  return clamp01(p);
}

// 0 = bajo, 1 = medio, 2 = alto
export const riskLevel = (p) => (p < 0.08 ? 0 : p < 0.2 ? 1 : 2);

// ---------- Geografía ----------
// Reloj del juego
const now = () => (S.t0 ?? 22) + S.hours;
const waitDaily = (h) => (h - (now() % 24) + 24) % 24;
const waitWeekly = (day, h) => (day * 24 + h - (now() % 168) + 168) % 168;
const DAY = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const hh = (h) => `${String(Math.floor(h % 24)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// En invierno la nieve cierra los pasos entre Chile y Argentina en la zona central y sur
const andesZone = (c) => c.la < -28 && c.la > -47;
const snowClosed = (a, b) => S.season === 'invierno' && ((a.c === 'CL' && b.c === 'AR') || (a.c === 'AR' && b.c === 'CL')) && andesZone(a) && andesZone(b);
// Desde Arica hacia el sur, el bus pasa el control aduanero de Cuya (zona franca)
const ruta5 = (a, b) => a.c === 'CL' && b.c === 'CL' && (a.id === 'arica' || b.id === 'arica');

// Tren entre dos ciudades de la misma línea: espera hasta la próxima salida y duración del viaje
function trainBetween(fromId, toId) {
  for (const t of TRAINS) {
    const i = t.stops.findIndex(([c]) => c === fromId), j = t.stops.findIndex(([c]) => c === toId);
    if (i < 0 || j < 0) continue;
    const fwd = j > i;
    // Hora a la que el tren pasa por tu estación, según de qué cabecera salió
    const off = fwd ? t.stops[i][1] : t.stops[t.stops.length - 1][1] - t.stops[i][1];
    const ride = Math.abs(t.stops[j][1] - t.stops[i][1]);
    let w, when;
    if (t.deps) {
      w = Math.min(...t.deps.map((h) => waitDaily((h + off) % 24)));
      when = `Sale todos los días a las ${t.deps.map((h) => hh(h + off)).join(', ')}`;
    } else {
      w = Math.min(...t.days.map((d) => waitWeekly((d + Math.floor((t.dep + off) / 24)) % 7, (t.dep + off) % 24)));
      when = `Pasa los ${t.days.map((d) => DAY[(d + Math.floor((t.dep + off) / 24)) % 7]).join(' y ')} a las ${hh(t.dep + off)}`;
    }
    return { line: t.n, w, ride, when };
  }
  return null;
}

// Medios de transporte entre dos ciudades: horas (h), costo (m), riesgo (p).
// info: detalles de la ruta · closed: motivo si no se puede usar · id: piden documento
export function modes(fromId, toId) {
  const from = CITY[fromId], to = CITY[toId], d = dist(from, to), intl = from.c !== to.c, out = [];
  if (fromId === toId) return { d, out };
  const world = !inSA(from) || !inSA(to);
  const notes = [];

  // Avión: solo entre ciudades con aeropuerto; los vuelos internacionales salen de aeropuertos internacionales
  const apF = airport(from), apT = airport(to);
  let canFly = !!apF && !!apT;
  if (!apF) notes.push(`${from.n} no tiene aeropuerto comercial.`);
  else if (!apT) notes.push(`${to.n} no tiene aeropuerto comercial.`);
  else if (world && inSA(from) && !HUB.has(fromId)) { canFly = false; notes.push(`Los vuelos fuera de Sudamérica salen de Santiago, Buenos Aires, Lima, Bogotá, Quito, Caracas, Brasilia o Montevideo.`); }
  else if (world && inSA(to) && !HUB.has(toId)) { canFly = false; notes.push(`A ${to.n} no llegan vuelos desde fuera de Sudamérica.`); }
  else if (intl && !world && !(intlAirport(from) && intlAirport(to))) { canFly = false; notes.push(`No hay vuelos directos de ${from.n} a ${to.n}: los vuelos internacionales salen de aeropuertos más grandes.`); }
  if (canFly) {
    const air = { k: 'air', n: 'Avión', h: 2.5 + d / 800 + (d > 4000 ? 3 : 0) + (intl ? 1 : 0), m: (50000 + d * 58) * (intl ? 1.2 : 1), p: idRisk('air', from, to), id: true, info: [] };
    if (checkAt(fromId) || checkAt(toId)) air.info.push(`Control de McCuack en ${checkAt(fromId) ? from.n : to.n}: revisan documentos con lupa.`);
    if (inSA(from) && !inSA(to)) air.exit = exitRisk();
    out.push(air);
  }

  // Tren
  const tr = !world && trainBetween(fromId, toId);
  if (tr) {
    const train = { k: 'tren', n: 'Tren', h: tr.w + tr.ride, m: 8000 + d * 22, id: intl, info: [`${tr.line}: ${tr.when.charAt(0).toLowerCase() + tr.when.slice(1)}${tr.w >= 1 ? ` (esperas ${Math.round(tr.w)} h)` : ''}.`] };
    train.p = intl ? idRisk('bus', from, to) : idRisk('bus', from, to) * 0.8;
    if (checkAt(fromId) || checkAt(toId)) {
      train.id = true;
      train.info.push(`Control de McCuack en ${checkAt(fromId) ? from.n : to.n}: revisan documentos en el andén.`);
      train.trace = `Un control de la PDI en la estación registra tu documento camino a ${to.n}.`;
    }
    out.push(train);
  }

  // Bus
  if (!world && d <= 3000) {
    const road = d * 1.3;
    const bus = { k: 'bus', n: 'Bus', h: road / 66 + 0.5 + (intl ? 2 : 0), m: S.perks.bus ? 0 : road * 28, p: idRisk('bus', from, to), id: intl, free: !!S.perks.bus, info: [] };
    if (snowClosed(from, to)) bus.closed = 'Paso cordillerano cerrado por nieve';
    if (checkAt(fromId) || checkAt(toId)) {
      bus.id = true;
      bus.info.push(`Control de McCuack en ${checkAt(fromId) ? from.n : to.n}: piden documento a todos los pasajeros.`);
      bus.trace = `Un control de la PDI registra tu documento en el bus a ${to.n}.`;
    }
    if (ruta5(from, to)) {
      bus.id = true;
      bus.p = idRisk('air', from, to);
      bus.info.push('Pasas por el control aduanero de Cuya, en la Ruta 5, que revisa documentos.');
      bus.trace = `El control aduanero de Cuya registra tu documento camino a ${to.n}.`;
    }
    out.push(bus);
  }

  // Paso clandestino
  if (!world && intl && (BORDER[from.c] || []).includes(to.c) && d <= 900) {
    const paso = { k: 'paso', n: 'Paso clandestino', h: d / 22 + 6, m: (220000 + d * 120) * (S.perks.map ? 0.6 : 1), p: clamp01((0.07 + S.heat / 900) * (S.perks.map ? 0.5 : 1)), id: false, info: [] };
    if (snowClosed(from, to)) paso.closed = 'La nieve tapó los pasos de montaña';
    out.push(paso);
  }
  return { d, out, note: !out.length || !canFly ? notes.join(' ') : '' };
}
