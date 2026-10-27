// El personaje: expresiones y frases que reaccionan al estado de la fuga.
import patoUrl from '../assets/pato/pato.webp';
import { CITY } from '../data/geo.js';
import { esc } from '../lib/util.js';
import { S, disguised, policeHere } from '../game/state.js';
import { checkAt, inZone } from '../game/pursuit.js';

const EXPR = import.meta.glob('../assets/pato/*.webp', { eager: true, import: 'default' });
// Algunos estados de ánimo comparten cara pero tienen frases propias
const FACE_OF = { policia: 'sorprendido', noticia: 'sorprendido', alerta: 'sorprendido', control: 'sorprendido', zona: 'normal', cansado: 'triste', pobre: 'triste', plan: 'guino' };
export const face = (mood) => EXPR[`../assets/pato/${FACE_OF[mood] || mood}.webp`] || EXPR['../assets/pato/normal.webp'];
export const PATO = patoUrl;

// Pato Malo habla en chileno de la calle. {city} = la ciudad donde está.
const QUIPS = {
  normal: [
    'Tranqui. Nadie busca a un pato con lentes.',
    'Un paso a la vez, compadre.',
    'Hay que pensar la próxima jugada, cachai.',
    'Piola nomás. El que se apura, cae.',
    'Ojo al charqui: los tiras andan por todos lados.',
    'Me hago el leso y sigo caminando.',
    'Bajo perfil y pico cerrado.',
    'Si me pillan en {city}, me culpan hasta del taco.',
    'Esto es como el carrete: la gracia es saber cuándo irse.',
    'Ni tan rápido que se note, ni tan lento que me pillen.',
  ],
  burlo: [
    'Aquí no me encuentran ni con GPS.',
    'Que me busquen debajo de la cama, po.',
    'Casa segura, pato feliz.',
    'Fondeado como campeón. Que se cansen los tiras.',
    'Más piola que gato en el techo.',
    'McCuack buscándome y yo aquí, tomando tecito.',
    'Cero estrés. Esto es la raja.',
    'Si alguien pregunta, soy un pato de la tele.',
  ],
  policia: [
    '¡¿Los tiras aquí?! Hay que apretar cachete.',
    '¡Me están pisando los talones!',
    'Esto se puso feo, al tiro.',
    '¡Chuta! Escucho sirenas.',
    'Hay que pelar el ajo antes que golpeen la puerta.',
    '¡McCuack en {city}! Me fui, me fui.',
    'Demasiado tira junto pa mi gusto.',
  ],
  noticia: [
    '¡Salí en las noticias! Ojo con lo que saben.',
    'Encontraron una pista mía. Hay que moverse.',
    'Mala cosa: los tiras saben algo nuevo.',
    'Me sapearon. Siempre hay un sapo.',
    'Salí en el matinal y ni me avisaron pa peinarme.',
    'Chuta, me mandé el medio condoro.',
  ],
  alerta: [
    'Todo el país me anda buscando.',
    'Con esta alerta, mejor no asomar el pico.',
    'Hasta la señora del almacén tiene mi foto.',
    'Andan revisando hasta las micros. Cuático.',
  ],
  control: [
    'Control en {city}. Hay que andar con buenos papeles… o con papeles buenos.',
    'Barrera de McCuack. Ni en bus me salvo.',
    'Revisan a todos. Mejor un carnet que no sea el mío.',
    'Puro tira con linterna. Mal día pa viajar.',
  ],
  zona: [
    'Estoy dentro del círculo de McCuack. Hay que salir de aquí.',
    'El círculo azul me tiene nervioso, compadre.',
    'Esta zona está más vigilada que la tele en final de la Copa América.',
    'Cada hora aquí es una hora más cerca de la comisaría.',
  ],
  cansado: [
    'Me estoy quedando dormido parado.',
    'Ando reventado. Una siesta y sigo.',
    'Si no duermo luego, quedo planchado en cualquier banca.',
    'Tengo más sueño que guardia de noche.',
  ],
  pobre: [
    'Ando más pato que nunca, y eso que soy pato.',
    'Me quedan puras chauchas.',
    'Sin lucas no hay fuga. Hay que hacer algo.',
    'Plata pal pasaje y gracias.',
  ],
  plan: [
    'Ya tengo contacto pa salir. Ahora hay que llegar entero.',
    'El plan va viento en popa, cachai.',
    'Con un buen contacto, esto es pan comido.',
    'Falta poco pa decir chao, Chile lindo.',
  ],
  sorprendido: ['¡¿Qué fue eso?!', '¡Chuta!', '¿Y eso, compadre?'],
  enojado: [
    'Estoy más caliente que un completo en Fiestas Patrias.',
    'Mi cara está en todas las noticias.',
    'Demasiado calor. Hay que enfriarse.',
    '¡Ya po! ¿No tienen otro delincuente que buscar?',
    'Esto está más prendido que asado del 18.',
    'Me tienen más visto que comercial de supermercado.',
  ],
  feliz: [
    '¡Otro día libre! Esto merece un premio.',
    'La suerte está de mi lado.',
    'Plata en el bolsillo, alas en los pies.',
    '¡Bacán! Un día más sin ver a McCuack.',
    'Esto se celebra con una piscola… cuando esté lejos.',
  ],
  guino: [
    'Con este look, ni mi mamá me reconoce.',
    'Disfrazado y con estilo.',
    'Nuevo pato, nueva vida.',
    'Pinta de cuico. Nadie sospecha de un cuico.',
    'Si McCuack me ve, me pide la hora.',
  ],
  rie: [
    '¡Chao, tiras! Nos vemos nunca.',
    '¡Lo logré! Pato Malo no se deja atrapar.',
    'Salúdenme a McCuack. Que se compre un mapa.',
    'Me voy a tomar un terremoto a la salud de la PDI.',
    '¡La hice! Esto fue más cuático que la teleserie.',
  ],
  triste: [
    'Me pillaron… la próxima será.',
    'Ni el mejor pato se escapa siempre.',
    'Chuta, me cacharon.',
    'Quedé achacado. Tanto correr pa nada.',
    'Por lo menos salí bien en la foto.',
  ],
};

// Expresión según lo más urgente que está pasando
export function moodOf() {
  if (!S) return 'burlo';
  if (S.over) return S.over.win ? 'rie' : 'triste';
  const c = CITY[S.cur];
  const alert = (S.alert[c.c] || -1) > S.hours;
  // Un rastro descubierto en las últimas 2 horas también lo asusta
  const freshTrace = S.traces.some((t) => t.shown && S.hours - t.at < 2);
  if (policeHere()) return 'policia';
  if (freshTrace) return 'noticia';
  if (S.heat >= 70) return 'enojado';
  if (checkAt(S.cur)) return 'control';
  if (alert && S.heat >= 45) return 'alerta';
  if (inZone(c)) return 'zona';
  if (S.awake >= 16) return 'cansado';
  if (S.reward && S.reward.day === S.days && S.hours - S.days * 24 < 3) return 'feliz';
  if (S.cash < 200000) return 'pobre';
  if (disguised()) return 'guino';
  if (S.safe.includes(S.cur)) return 'burlo';
  if (S.passQ === 'top' || Object.values(S.contacts || {}).some((k) => k.found)) return 'plan';
  return 'normal';
}

// La frase cambia con el tiempo de juego, no con cada redibujo
export function quip(mood) {
  const list = QUIPS[mood] || QUIPS.normal;
  const seed = S ? Math.floor(S.hours / 2) * 7 + S.path.length * 3 : Math.floor(Math.random() * 97);
  return list[seed % list.length].replace(/\{city\}/g, S ? CITY[S.cur].n : 'la ciudad');
}

export function patoBubble() {
  const m = moodOf();
  return `<div class="pato-bubble" data-mood="${FACE_OF[m] || m}"><img class="pato-face" src="${face(m)}" alt="Pato Malo ${m}" width="56" height="56"><p>${esc(quip(m))}</p></div>`;
}
