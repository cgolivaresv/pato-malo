// Riesgos de los controles y opciones de transporte, con la geografía real del cono sur.
import { CITY, HUB, BORDER, inSA } from '../data/geo.js';
import { clamp01, dist } from '../lib/util.js';
import { S, disguised, interpol } from './state.js';

// Probabilidad de que te detengan en un control de identidad
export function idRisk(kind, from, to) {
  const intl = from.c !== to.c, alertC = (S.alert[from.c] || -1) > S.hours;
  let p = 0;
  if (S.id === 'fake' && !S.idBurnSecret) {
    p = (intl ? 0.045 : 0.025) + S.heat / 750;
    if (interpol()) p *= 1.4;
  } else {
    p = (intl ? 0.17 : 0.06) + S.heat / (intl ? 220 : 400);
    if (interpol()) p = p * 2.4 + 0.08;
  }
  if (kind === 'bus' && !intl) p = S.heat / 2000;
  if (alertC) p += 0.07;
  if (S.police.city === from.id && S.police.arrive == null) p += 0.18;
  if (disguised()) p *= 0.6;
  if (S.perks.press && kind !== 'paso') p *= 0.5;
  return clamp01(p);
}

// 0 = bajo, 1 = medio, 2 = alto
export const riskLevel = (p) => (p < 0.08 ? 0 : p < 0.2 ? 1 : 2);

// ---------- Geografía ----------
// Reloj del juego: la fuga empieza el lunes a las 22:00
const now = () => 22 + S.hours;
const waitDaily = (h) => (h - (now() % 24) + 24) % 24;
const waitWeekly = (day, h) => (day * 24 + h - (now() % 168) + 168) % 168;
const DAY = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// En invierno la nieve cierra los pasos entre Chile y Argentina en la zona central y sur
const andesZone = (c) => c.la < -28 && c.la > -47;
const snowClosed = (a, b) => S.season === 'invierno' && ((a.c === 'CL' && b.c === 'AR') || (a.c === 'AR' && b.c === 'CL')) && andesZone(a) && andesZone(b);
// Magallanes chileno: por tierra se llega desde el norte cruzando Argentina
const magallanes = (c) => c.c === 'CL' && c.la < -50;
const viaArgentina = (a, b) => (magallanes(a) && b.c === 'CL' && b.la > -47) || (magallanes(b) && a.c === 'CL' && a.la > -47);
// Coyhaique desde el norte: barcaza por la Carretera Austral, sale a las 08:00
const austral = (a, b) => (a.id === 'coyhaique' && b.c === 'CL' && b.la > -43) || (b.id === 'coyhaique' && a.c === 'CL' && a.la > -43);
// Chiloé: transbordador del canal de Chacao
const chacao = (a, b) => (a.id === 'castro') !== (b.id === 'castro') && a.c === 'CL' && b.c === 'CL';
// Norte Grande: controles aduaneros de la Ruta 5 (zona franca de Iquique y Arica)
const ZOFRI = ['arica', 'iquique'];
const ruta5 = (a, b) => a.c === 'CL' && b.c === 'CL' && (ZOFRI.includes(a.id) || ZOFRI.includes(b.id));
// Vuelos al extremo sur: en invierno, el clima los atrasa
const farSouth = (c) => c.la < -45;
// Barco semanal Puerto Montt – Puerto Natales por los canales patagónicos
const SHIP = { puertomontt: { to: 'natales', day: 4, h: 16 }, natales: { to: 'puertomontt', day: 1, h: 6 } };

// Medios de transporte entre dos ciudades: horas (h), costo (m), riesgo (p).
// info: detalles de la ruta · closed: motivo si no se puede usar · id: piden documento
export function modes(fromId, toId) {
  const from = CITY[fromId], to = CITY[toId], d = dist(from, to), intl = from.c !== to.c, out = [];
  if (fromId === toId) return { d, out };
  const easter = from.air || to.air;
  if (easter && !(fromId === 'santiago' || toId === 'santiago')) return { d, out, note: 'A Isla de Pascua solo se vuela desde Santiago.' };
  const world = !inSA(from) || !inSA(to);
  if (world && inSA(from) && !HUB.has(fromId)) {
    return { d, out, note: 'Los vuelos fuera de Sudamérica salen solo de grandes aeropuertos: Santiago, Buenos Aires, Lima, Bogotá, Caracas, Brasilia, Quito o Montevideo.' };
  }

  // Avión
  const air = { k: 'air', n: 'Avión', h: 2.5 + d / 800 + (d > 4000 ? 3 : 0) + (intl ? 1 : 0), m: (50000 + d * 58) * (intl ? 1.2 : 1), p: idRisk('air', from, to), id: true, info: [] };
  if (S.season === 'invierno' && (farSouth(from) || farSouth(to)) && inSA(from) && inSA(to)) { air.h += 2; air.info.push('Invierno: el viento austral atrasa los vuelos (+2 h).'); }
  out.push(air);

  // Bus
  if (!world && !easter && d <= 3000) {
    const road = d * 1.3;
    const bus = { k: 'bus', n: 'Bus', h: road / 66 + 0.5 + (intl ? 2 : 0), m: S.perks.bus ? 0 : road * 28, p: idRisk('bus', from, to), id: intl, free: !!S.perks.bus, info: [] };
    if (snowClosed(from, to)) bus.closed = 'Paso cordillerano cerrado por nieve';
    if (viaArgentina(from, to)) {
      bus.id = true; bus.h += 2;
      bus.p = idRisk('bus', from, { ...to, c: 'AR' });
      bus.info.push('No hay camino por Chile: el bus cruza Argentina y pasa dos controles de frontera.');
      bus.trace = 'El control fronterizo de Monte Aymond registra tu paso por Argentina en bus.';
    }
    if (austral(from, to)) {
      const w = waitDaily(8);
      bus.h += w + 5;
      bus.info.push(`Incluye la barcaza de la Carretera Austral, que sale a las 08:00${w >= 1 ? ` (esperas ${Math.round(w)} h)` : ''}.`);
    }
    if (chacao(from, to)) { bus.h += 1; bus.info.push('Cruzas el canal de Chacao en transbordador.'); }
    if (ruta5(from, to)) {
      bus.id = true;
      bus.p = idRisk('air', from, to);
      bus.info.push('Pasas por un control aduanero de la Ruta 5 que revisa documentos.');
      bus.trace = `Un control aduanero de la Ruta 5 registra tu documento camino a ${to.n}.`;
    }
    out.push(bus);
  }

  // Paso clandestino
  if (!world && !easter && intl && (BORDER[from.c] || []).includes(to.c) && d <= 900) {
    const paso = { k: 'paso', n: 'Paso clandestino', h: d / 22 + 6, m: (220000 + d * 120) * (S.perks.map ? 0.6 : 1), p: clamp01((0.07 + S.heat / 900) * (S.perks.map ? 0.5 : 1)), id: false, info: [] };
    if (snowClosed(from, to)) paso.closed = 'La nieve tapó los pasos de montaña';
    out.push(paso);
  }

  // Barco semanal por los canales patagónicos
  const ship = SHIP[fromId];
  if (ship && ship.to === toId) {
    const w = waitWeekly(ship.day, ship.h);
    out.push({ k: 'barco', n: 'Barco por los canales', h: w + 76, m: 180000, p: 0.01, id: false, info: [`Sale los ${DAY[ship.day]} a las ${String(ship.h).padStart(2, '0')}:00${w >= 1 ? ` (esperas ${Math.round(w)} h)` : ''}. Tres noches navegando: duermes a bordo.`] });
  }
  return { d, out };
}
