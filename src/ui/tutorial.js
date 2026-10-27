// Tutorial de la primera fuga: Pato Malo ilumina cada parte de la pantalla y la explica.
import { CITY, COUNTRIES } from '../data/geo.js';
import { $, esc, store } from '../lib/util.js';
import { S, crime } from '../game/state.js';
import { face } from './pato.js';
import { render } from './render.js';

const KEY = 'pato-tutorial-visto';

function objectiveText() {
  const cr = crime();
  if (cr.id === 'arte') return `llegar a ${CITY[S.buyer].n} (${COUNTRIES[CITY[S.buyer].c].n}) con el óleo y pasar migraciones`;
  if (cr.id === 'joyas') return 'vender las joyas en Sudamérica y después salir del continente';
  return 'salir de Sudamérica y pasar migraciones en una capital del mundo';
}

const STEPS = [
  { sel: null, mood: 'burlo', title: '¡Hola! Soy Pato Malo', text: () => 'Acabo de dar el golpe y la PDI ya me anda buscando. Te muestro lo básico en un minuto para que me ayudes a escapar.' },
  { sel: '#stats', mood: 'normal', title: 'Hora, plata y calor', text: () => 'El calor es cuánto me busca la policía en el país donde estoy. Mientras más alto, más peligrosos los controles. Toca esta barra para ver el calor de cada país.' },
  { sel: '.mapwrap', mood: 'normal', title: 'El mapa', text: () => 'Arrástralo para moverte y pellízcalo para acercar. Toca una ciudad para ver cómo llegar. Las X rojas son rastros míos que la PDI ya descubrió. El círculo azul es la zona donde me busca McCuack, y las barreras rojas son sus controles: mejor esquivarlos. Las casitas verdes son casas seguras.' },
  { sel: '.dock-btn[data-arg="move"]', mood: 'guino', title: 'Moverse', text: () => 'El avión es rápido pero pide documento: con el real, me ubican al tiro. El bus es lento pero más silencioso. Cada país tiene su propio calor, así que cruzar una frontera me enfría. En invierno la nieve cierra los pasos a Argentina.' },
  { sel: '.dock-btn[data-arg="hide"]', mood: 'normal', title: 'Esconderse', text: () => 'Dormir baja el calor. Una casa segura es lo mejor: nadie registra mi nombre. Ojo, después de 20 horas despierto me quedo dormido donde sea.' },
  { sel: '.dock-btn[data-arg="money"]', mood: 'feliz', title: 'Plata', text: () => 'Si me quedo corto, aquí puedo vender mis cosas o parte del botín, hacer encargos o pedirle al usurero. Todo deja huella.' },
  { sel: '.dock-btn[data-arg="under"]', mood: 'guino', title: 'Escape', text: () => 'No basta con tomar un avión: necesito un capitán de carguero, un piloto de avioneta o un falsificador maestro. Aquí pregunto por ellos en el bajo mundo. Ojo, que los rumores a veces son mentira: si dos me dicen lo mismo, seguro es cierto.' },
  { sel: '.dock-btn[data-arg="news"]', mood: 'noticia', title: 'Noticias', text: () => 'Lo que hago se descubre horas después. Después de cada acción te muestro un parte con todo lo nuevo, con las alertas primero; aquí queda el historial completo. Cuando aparezca McCuack con su sello, hay que moverse.' },
  { sel: '#strip', mood: 'feliz', title: 'Nuestro objetivo', text: () => `Tenemos que ${objectiveText()}. ¡Arranquemos!` },
];

let step = 0;

export function startTutorial() {
  if (!S) return;
  S.tab = 'act';
  render();
  step = 0;
  show();
  addEventListener('resize', place);
}

// Pedido desde la pantalla de inicio: se muestra al empezar la próxima fuga aunque ya se haya visto
let forced = false;
export function wantTutorial() { forced = true; }
export function maybeTutorial() { if (forced || !store(KEY)) { forced = false; startTutorial(); } }

export function tutNext() { step++; if (step >= STEPS.length) endTutorial(); else show(); }
export function endTutorial() {
  store(KEY, true);
  removeEventListener('resize', place);
  const t = $('#tut');
  if (t) t.remove();
}

function show() {
  let t = $('#tut');
  if (!t) { t = document.createElement('div'); t.id = 'tut'; t.className = 'tut'; document.body.appendChild(t); }
  const s = STEPS[step], last = step === STEPS.length - 1;
  t.innerHTML = `<div class="tut-spot" aria-hidden="true"></div>
  <div class="tut-card" role="dialog" aria-modal="true" aria-label="Tutorial, paso ${step + 1} de ${STEPS.length}">
    <img src="${face(s.mood)}" alt="" width="64" height="64">
    <div class="tut-txt"><div class="tut-step">Paso ${step + 1} de ${STEPS.length}</div><b>${esc(s.title)}</b><p>${esc(s.text())}</p>
    <div class="tut-act">${last ? '' : '<button type="button" class="btn ghost" data-act="tutSkip">Saltar</button>'}<button type="button" class="btn" data-act="tutNext">${last ? '¡A escapar!' : 'Siguiente'}</button></div></div>
  </div>`;
  place();
  t.querySelector('[data-act="tutNext"]').focus();
}

// Ubica el foco sobre el elemento y la tarjeta arriba o abajo de él
function place() {
  const t = $('#tut');
  if (!t) return;
  const s = STEPS[step], spot = t.querySelector('.tut-spot'), card = t.querySelector('.tut-card');
  const el = s.sel && document.querySelector(s.sel);
  if (!el) { spot.hidden = true; t.classList.add('center'); card.style.top = ''; card.style.bottom = ''; return; }
  t.classList.remove('center');
  spot.hidden = false;
  const r = el.getBoundingClientRect(), pad = 6;
  Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  // La tarjeta va donde quepa entera: abajo o arriba del elemento; si no cabe en ninguno
  // (el mapa ocupa casi toda la pantalla), queda pegada abajo, encima del elemento.
  const H = innerHeight, gap = 12;
  card.style.top = ''; card.style.bottom = '';
  const ch = card.offsetHeight;
  const room = { below: H - r.bottom - 16 - gap, above: r.top - 16 - gap };
  if (room.below >= ch && (room.below >= room.above || room.above < ch)) card.style.top = `${r.bottom + 16}px`;
  else if (room.above >= ch) card.style.bottom = `${H - r.top + 16}px`;
  else card.style.bottom = `${gap}px`;
}
