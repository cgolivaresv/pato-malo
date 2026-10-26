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

// Aeropuertos con vuelos fuera de Sudamérica
export const HUB = new Set(['santiago', 'buenosaires', 'lima', 'bogota', 'caracas', 'brasilia', 'quito', 'montevideo']);

// Fronteras terrestres (para los pasos clandestinos)
export const BORDER = {
  CL: ['AR', 'PE', 'BO'], AR: ['CL', 'BO', 'BR', 'UY', 'PY'], PE: ['CL', 'BO', 'BR', 'CO', 'EC'],
  BO: ['CL', 'AR', 'PE', 'BR', 'PY'], BR: ['AR', 'BO', 'PE', 'UY', 'PY', 'CO', 'VE'], UY: ['AR', 'BR'],
  PY: ['AR', 'BO', 'BR'], CO: ['PE', 'BR', 'EC', 'VE'], EC: ['PE', 'CO'], VE: ['CO', 'BR'],
};
