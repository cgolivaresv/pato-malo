// Detective Patrick McCuack: el jefe de la brigada que persigue a Pato Malo.
// Solo lee el estado de la partida; no cambia la lógica de la policía.
import mccuackUrl from '../assets/detective/mccuack.webp';
import { CITY } from '../data/geo.js';
import { esc } from '../lib/util.js';
import { S, policeHere, interpol, crime } from '../game/state.js';
import { activeChecks } from '../game/pursuit.js';

const EXPR = import.meta.glob('../assets/detective/*.webp', { eager: true, import: 'default' });
export const detFace = (mood) => EXPR[`../assets/detective/${mood}.webp`] || EXPR['../assets/detective/normal.webp'];
export const MCCUACK = mccuackUrl;
export const DET_NAME = 'Detective Patrick McCuack';
export const MOTTO = 'La ley también tiene patas.';

// {city} se reemplaza por la ciudad del último rastro conocido (o el destino de la brigada).
// McCuack habla culto, formal e irónico: siempre trata de usted al señor Pato.
const QUIPS = {
  normal: [
    'Ningún prófugo es más rápido que el papeleo bien hecho.',
    'Paciencia. Los patos siempre vuelven al agua.',
    'La impaciencia es un lujo reservado a los culpables.',
    'Un buen detective no corre: llega.',
    'He leído a Conan Doyle tres veces. El señor Pato, sospecho, ni las instrucciones del pasaporte.',
    'Dura lex, sed lex. La ley es dura, pero tiene patas.',
    'Mi té se enfría; mi olfato, jamás.',
    'Todo crimen deja una pluma. Yo, casualmente, colecciono plumas.',
  ],
  serio: [
    'Vamos a {city}. Que nadie despegue sin mi permiso.',
    'Brigada, nos trasladamos a {city}. Sin demora y sin bocinazos.',
    'Rumbo a {city}. Lleven paraguas y esposas, en ese orden.',
    'Señores, {city} nos espera. Y, con algo de fortuna, nuestro amigo emplumado también.',
    'Preparen el vehículo. En {city} tengo una conversación pendiente.',
  ],
  burlon: [
    '¿{city}? Señor Pato, es usted más predecible que un horóscopo.',
    'Dejó plumas en {city}. Un descuido muy poco elegante.',
    'Lo vimos en {city}. Le sugiero un disfraz menos… palmípedo.',
    '{city}, anotado. Su itinerario me resulta de lo más instructivo.',
    'Gracias por la pista en {city}. Es usted muy colaborador, para ser prófugo.',
    'Elemental: un pato que pasa por {city} deja huellas en {city}.',
  ],
  pensativo: [
    'Se me enfrió la pista… pero los aeropuertos no se mueven.',
    'Si yo fuera un pato malo, ¿dónde me escondería?',
    'El silencio también es una pista. Silenciosa, pero pista al fin.',
    'Ni un rastro. Qué curioso. Qué irritantemente curioso.',
    'Tarde o temprano, todo pato tiene hambre. Y el hambre hace ruido.',
  ],
  enfadado: [
    '¡Todo el país conoce su cara, señor Pato!',
    '¡Quiero a ese pato antes del noticiero de las nueve!',
    'Su rostro está en cada pantalla del país. Tenga la decencia de rendirse.',
    '¡Señores, esto ya es una cuestión de honor institucional!',
    'Hasta mi suegra me pregunta por usted. Eso, señor Pato, es imperdonable.',
  ],
  controles: [
    'He sembrado controles como quien siembra trigo. Ya veremos qué cosecho.',
    'Cada bus revisado, cada carnet leído. La burocracia es mi arma predilecta.',
    'Las barreras están puestas. Ahora, a esperar que el pato sea pato.',
  ],
  interpol: [
    'Interpol ya tiene su ficha. Su fama, señor Pato, es ahora internacional.',
    'Notificación roja emitida. El mundo entero es mi brigada.',
    'Ni en el extranjero podrá usted «pasar piola», como dicen los jóvenes. Creo.',
  ],
  inicio: [
    'Alerta a todas las unidades: un pato con gorra y lentes oscuros. La ley también tiene patas.',
    'Se busca: palmípedo, con gorra y pésimo criterio. Procedan.',
    'Ah, un caso nuevo. Preparen el té y las esposas.',
    'Señores, cierren los aeropuertos con la delicadeza de siempre.',
  ],
  victoria: [
    'Caso cerrado. La ley también tiene patas.',
    'Le dije que lo encontraría, señor Pato.',
    'Esposas talla pato, por favor. Las tenía reservadas.',
    'Tiene derecho a guardar silencio. Se lo recomiendo: sus huellas ya hablaron bastante.',
    'Fue un placer perseguirlo. Bueno, más mío que suyo.',
  ],
  sorprendido: [
    '¡¿Cómo que pasó migraciones?! ¡Revisen esas cámaras!',
    'Imposible… ¡se me escapó entre las patas!',
    'Señores, redacten el informe. Y omitan la parte en que perdí.',
    'Touché, señor Pato. Pero los casos nunca se cierran del todo.',
    'Ganó usted una batalla. La guerra, como el papeleo, continúa.',
  ],
};
const FACE_OF = { victoria: 'burlon', controles: 'normal', interpol: 'serio', inicio: 'serio' };

const freshTrace = () => S.traces.some((t) => t.shown && S.hours - t.at < 2);

export function detMood() {
  if (!S) return 'normal';
  if (S.over) return S.over.win ? 'sorprendido' : 'victoria';
  if (freshTrace()) return 'burlon';
  if (S.heat >= 75) return 'enfadado';
  if (S.police.arrive != null) return 'serio';
  if (interpol() && S.hours - crime().interpol < 6) return 'interpol';
  if (activeChecks().length) return 'controles';
  if (S.police.idle >= 6) return 'pensativo';
  return 'normal';
}

export function detQuip(mood) {
  const list = QUIPS[mood] || QUIPS.normal;
  const seed = S && mood !== 'inicio' ? Math.floor(S.hours / 3) * 5 + S.traces.filter((t) => t.shown).length * 2 : Math.floor(Math.random() * 97);
  const known = S && S.police.known ? CITY[S.police.known].n : 'la ciudad';
  const target = S && S.police.target ? CITY[S.police.target].n : known;
  return list[seed % list.length].replace(/\{city\}/g, mood === 'serio' ? target : known);
}

export function detVisible() {
  if (!S || S.over) return false;
  return freshTrace() || S.hours < S.soplonUntil || policeHere();
}

export function detBubble(mood = detMood()) {
  return `<div class="det-bubble" data-mood="${FACE_OF[mood] || mood}"><p><b>McCuack</b> ${esc(detQuip(mood))}</p><img class="det-face" src="${detFace(FACE_OF[mood] || mood)}" alt="${DET_NAME}" width="56" height="56"></div>`;
}
