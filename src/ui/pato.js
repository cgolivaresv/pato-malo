// El personaje: expresiones y frases que reaccionan al estado de la fuga.
import patoUrl from '../assets/pato/pato.webp';
import { CITY } from '../data/geo.js';
import { esc } from '../lib/util.js';
import { S, disguised, policeHere } from '../game/state.js';

const EXPR = import.meta.glob('../assets/pato/*.webp', { eager: true, import: 'default' });
// Algunos estados de ánimo comparten cara pero tienen frases propias
const FACE_OF = { policia: 'sorprendido', noticia: 'sorprendido', alerta: 'sorprendido' };
export const face = (mood) => EXPR[`../assets/pato/${FACE_OF[mood] || mood}.webp`] || EXPR['../assets/pato/normal.webp'];
export const PATO = patoUrl;

const QUIPS = {
  normal: ['Tranquilo. Nadie busca a un pato con lentes.', 'Un paso a la vez, compadre.', 'Hay que pensar la próxima jugada.'],
  burlo: ['Aquí no me encuentran ni con GPS.', 'Que me busquen debajo de la cama.', 'Casa segura, pato feliz.'],
  policia: ['¡¿La PDI aquí?! Hay que arrancar.', '¡Me están pisando los talones!', 'Esto se puso feo, rápido.'],
  noticia: ['¡Salí en las noticias! Ojo con lo que saben.', 'Encontraron una pista mía. Hay que moverse.', 'Mala cosa: la PDI sabe algo nuevo.'],
  alerta: ['Todo el país me anda buscando.', 'Con esta alerta, mejor no asomar el pico.'],
  sorprendido: ['¡¿Qué fue eso?!'],
  enojado: ['Estoy más caliente que un completo en Fiestas Patrias.', 'Mi cara está en todas las noticias.', 'Demasiado calor. Hay que enfriarse.'],
  feliz: ['¡Otro día libre! Esto merece un premio.', 'La suerte está de mi lado.', 'Plata en el bolsillo, alas en los pies.'],
  guino: ['Con este look, ni mi mamá me reconoce.', 'Disfrazado y con estilo.', 'Nuevo pato, nueva vida.'],
  rie: ['¡Chao, PDI! Nos vemos nunca.', '¡Lo logré! Pato Malo no se deja atrapar.'],
  triste: ['Me pillaron… la próxima será.', 'Ni el mejor pato se escapa siempre.'],
};

// Expresión según lo más urgente que está pasando
export function moodOf() {
  if (!S) return 'burlo';
  if (S.over) return S.over.win ? 'rie' : 'triste';
  const alert = (S.alert[CITY[S.cur].c] || -1) > S.hours;
  // Un rastro descubierto en las últimas 2 horas también lo asusta
  const freshTrace = S.traces.some((t) => t.shown && S.hours - t.at < 2);
  if (policeHere() && S.hours < S.soplonUntil) return 'policia';
  if (freshTrace) return 'noticia';
  if (S.heat >= 70) return 'enojado';
  if (alert && S.heat >= 45) return 'alerta';
  if (S.reward && S.reward.day === S.days && S.hours - S.days * 24 < 3) return 'feliz';
  if (disguised()) return 'guino';
  if (S.safe.includes(S.cur)) return 'burlo';
  return 'normal';
}

// La frase cambia con el tiempo de juego, no con cada redibujo
export function quip(mood) {
  const list = QUIPS[mood];
  const seed = S ? Math.floor(S.hours / 2) + S.path.length : 0;
  return list[seed % list.length];
}

export function patoBubble() {
  const m = moodOf();
  return `<div class="pato-bubble" data-mood="${FACE_OF[m] || m}"><img class="pato-face" src="${face(m)}" alt="Pato Malo ${m}" width="56" height="56"><p>${esc(quip(m))}</p></div>`;
}
