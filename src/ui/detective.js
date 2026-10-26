// Detective Patrick McCuack: el jefe de la brigada que persigue a Pato Malo.
// Solo lee el estado de la partida; no cambia la lógica de la policía.
import mccuackUrl from '../assets/detective/mccuack.webp';
import { CITY } from '../data/geo.js';
import { esc } from '../lib/util.js';
import { S, policeHere } from '../game/state.js';

const EXPR = import.meta.glob('../assets/detective/*.webp', { eager: true, import: 'default' });
export const detFace = (mood) => EXPR[`../assets/detective/${mood}.webp`] || EXPR['../assets/detective/normal.webp'];
export const MCCUACK = mccuackUrl;
export const DET_NAME = 'Detective Patrick McCuack';
export const MOTTO = 'La ley también tiene patas.';

// {city} se reemplaza por la ciudad del último rastro conocido
const QUIPS = {
  normal: ['Ningún prófugo es más rápido que el papeleo bien hecho.', 'Paciencia. Los patos siempre vuelven al agua.'],
  serio: ['Vamos a {city}. Que nadie despegue sin mi permiso.', 'Brigada, nos movemos a {city}. Ahora.'],
  burlon: ['¿{city}? Pato Malo, eres más predecible de lo que crees.', 'Dejaste plumas en {city}. Ya casi te tengo.', 'Te vi en {city}, compadre. La ley también tiene patas.'],
  pensativo: ['Se me enfrió la pista… Pero los aeropuertos no se mueven.', 'Si yo fuera un pato malo, ¿dónde me escondería?'],
  enfadado: ['¡Todo el país conoce tu cara, Pato Malo!', '¡Quiero a ese pato antes del noticiero de las nueve!'],
  sorprendido: ['¡¿Cómo que pasó migraciones?! ¡Revisen esas cámaras!', 'Imposible… ¡se me escapó entre las patas!'],
  victoria: ['Caso cerrado. La ley también tiene patas.', 'Te dije que te iba a encontrar, Pato Malo.'],
};
const FACE_OF = { victoria: 'burlon' };

const freshTrace = () => S.traces.some((t) => t.shown && S.hours - t.at < 2);

export function detMood() {
  if (!S) return 'normal';
  if (S.over) return S.over.win ? 'sorprendido' : 'victoria';
  if (freshTrace()) return 'burlon';
  if (S.heat >= 75) return 'enfadado';
  if (S.police.arrive != null) return 'serio';
  if (S.police.idle >= 6) return 'pensativo';
  return 'normal';
}

export function detQuip(mood) {
  const list = QUIPS[mood];
  const seed = S ? Math.floor(S.hours / 3) + S.traces.filter((t) => t.shown).length : 0;
  const known = S && S.police.known ? CITY[S.police.known].n : 'la ciudad';
  const target = S && S.police.target ? CITY[S.police.target].n : known;
  return list[seed % list.length].replace('{city}', mood === 'serio' ? target : known);
}

// McCuack habla en el panel solo cuando lo que dice sirve: rastro recién descubierto,
// soplón activo o la brigada en tu ciudad
export function detVisible() {
  if (!S || S.over) return false;
  return freshTrace() || S.hours < S.soplonUntil || (policeHere() && S.hours < S.soplonUntil);
}

export function detBubble(mood = detMood()) {
  return `<div class="det-bubble" data-mood="${FACE_OF[mood] || mood}"><p><b>McCuack</b> ${esc(detQuip(mood))}</p><img class="det-face" src="${detFace(FACE_OF[mood] || mood)}" alt="${DET_NAME}" width="56" height="56"></div>`;
}
