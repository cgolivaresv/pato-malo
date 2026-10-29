// Agrupaciones geográficas que usa la lógica de viajes.
import { COUNTRIES, CITIES } from './places.js';

export { COUNTRIES, CITIES };
export const CITY = Object.fromEntries(CITIES.map((c) => [c.id, c]));

// Cono sur: Chile y sus vecinos
export const CONO = ['CL', 'AR', 'PE', 'BO'];
// Sudamérica completa
export const SA = [...CONO, 'BR', 'UY', 'PY', 'CO', 'EC', 'VE'];
export const inSA = (c) => SA.includes(c.c);

// Ciudades grandes: hay falsificadores y casas de cambio
export const BIG = new Set(['santiago', 'buenosaires', 'lima', 'lapaz', 'bogota', 'quito', 'caracas', 'brasilia', 'montevideo', 'asuncion', 'cordoba', 'rosario', 'santacruz', 'mendoza', 'arequipa', 'concepcion', 'valparaiso', 'antofagasta']);

// Aeropuertos. hub: vuelos a todo el mundo · intl: vuelos a otros países de Sudamérica · nat: solo vuelos nacionales.
// Valparaíso y Talca no tienen aeropuerto comercial: se llega en bus o tren. Fuera de Sudamérica, toda capital es hub.
const AP = {
  santiago: 'hub', arica: 'nat', antofagasta: 'nat', concepcion: 'nat', puertomontt: 'nat',
  buenosaires: 'hub', cordoba: 'intl', mendoza: 'intl', rosario: 'nat', tucuman: 'nat', salta: 'nat', bariloche: 'nat',
  lima: 'hub', arequipa: 'nat', cusco: 'nat', trujillo: 'nat', tacna: 'nat',
  lapaz: 'intl', santacruz: 'intl', cochabamba: 'nat',
  brasilia: 'hub', montevideo: 'hub', asuncion: 'intl', bogota: 'hub', quito: 'hub', caracas: 'hub',
};
export const airport = (c) => (inSA(c) ? AP[c.id] || null : 'hub');
export const intlAirport = (c) => ['hub', 'intl'].includes(airport(c));
export const HUB = new Set(CITIES.filter((c) => airport(c) === 'hub' && inSA(c)).map((c) => c.id));

// Trenes de pasajeros que existen de verdad. stops: [ciudad, horas desde la cabecera].
// deps: salidas diarias (hora) desde cada extremo · days + dep: tren semanal (días 0 = lunes)
export const TRAINS = [
  { n: 'Tren Santiago–Chillán', stops: [['santiago', 0], ['talca', 2.7]], deps: [7.5, 12.5, 18] },
  { n: 'Tren Arica–Tacna', stops: [['arica', 0], ['tacna', 1.3]], deps: [9, 16] },
  { n: 'Tren a Córdoba', stops: [['buenosaires', 0], ['rosario', 6.5], ['cordoba', 17]], days: [0, 4], dep: 20 },
  { n: 'Tren a Tucumán', stops: [['buenosaires', 0], ['rosario', 6.5], ['tucuman', 25]], days: [1, 4], dep: 10 },
];
export const hasTrain = (id) => TRAINS.some((t) => t.stops.some(([c]) => c === id));

// Fronteras terrestres (para los pasos clandestinos)
export const BORDER = {
  CL: ['AR', 'PE', 'BO'], AR: ['CL', 'BO', 'BR', 'UY', 'PY'], PE: ['CL', 'BO', 'BR', 'CO', 'EC'],
  BO: ['CL', 'AR', 'PE', 'BR', 'PY'], BR: ['AR', 'BO', 'PE', 'UY', 'PY', 'CO', 'VE'], UY: ['AR', 'BR'],
  PY: ['AR', 'BO', 'BR'], CO: ['PE', 'BR', 'EC', 'VE'], EC: ['PE', 'CO'], VE: ['CO', 'BR'],
};
