// Ventanas superpuestas: elegir golpe, informe del golpe y resultado.
import { CITY } from '../data/geo.js';
import { CRIMES } from '../data/content.js';
import { $, esc, money, clock, store } from '../lib/util.js';
import { S, setS, newGame, crime, me } from '../game/state.js';
import { news } from '../game/engine.js';
import { render } from './render.js';
import { zoomMe } from './map.js';
import { PATO, face, quip } from './pato.js';
import { MCCUACK, DET_NAME, MOTTO, detBubble, detFace } from './detective.js';
import { I } from './icons.js';
import { endStamp } from './fx.js';

const ov = () => $('#ov');
const modal = (label, inner, cls = '') => `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${label}"><div class="tape" aria-hidden="true"></div><div class="in">${inner}</div></div>`;

export function closeOv() { ov().hidden = true; ov().innerHTML = ''; }

const STARS = (n) => `<span class="lvl" aria-label="Dificultad ${n} de 5">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5 - n)}</span>`;

export function showCrimes() {
  const car = store('fuga-career') || { escapes: 0, played: 0, points: 0 };
  ov().hidden = false;
  ov().innerHTML = modal('Elegir golpe', `
  <div class="hero">
    <div class="hero-txt">
      <div class="file-no">Expediente N.º ${String(car.played + 1).padStart(4, '0')} · ${car.escapes}/${car.played} fugas · ${car.points.toLocaleString('es-CL')} pts</div>
      <h1>Pato<br>Malo</h1>
      <p class="hero-quip">«Nadie atrapa a un pato con estilo.»</p>
    </div>
    <img class="hero-pato" src="${PATO}" alt="Pato Malo con gorra, lentes oscuros y chaqueta de cuero" width="328" height="457">
  </div>
  <p class="lead">Acabas de dar el golpe en Chile. Cada cosa que haces puede dejar un rastro que la policía descubre horas después, y la brigada viaja al último lugar donde supo de ti.</p>
  <div class="rival"><img src="${MCCUACK}" alt="${DET_NAME}, con sombrero fedora, lentes oscuros y gabardina" width="90" height="149"><div><div class="file-no">Te persigue</div><b>${DET_NAME}</b><p>Jefe de la Brigada de Robos. Nunca duerme y nunca olvida una pista.</p><p class="rival-motto">«${MOTTO}»</p></div></div>
  <details class="rules"><summary>Cómo se juega</summary><ul>
    <li>No ves a la policía. Te enteras de lo que sabe por las noticias, o pagando a un soplón.</li>
    <li>Volar con tu documento real los lleva directo a ti. El bus y los pasos clandestinos son más lentos pero más silenciosos.</li>
    <li>El <b>calor</b> sube con cada rastro descubierto y hace más peligrosos los controles. Baja cuando te escondes.</li>
    <li>Si la brigada llega a tu ciudad, cada hora ahí es un riesgo. Una casa segura es el mejor escondite.</li>
    <li>¿Sin plata? Vende tus cosas o parte del botín, haz encargos, asalta o pide al usurero. Todo deja huella.</li>
    <li>Cada 24 horas sin ser atrapado ganas una recompensa.</li>
  </ul></details>
  <h2 class="pick">Elige el golpe</h2>
  <div class="crimes">${CRIMES.map((c) => `<button class="crime" type="button" data-act="start" data-arg="${c.id}">${STARS(c.lvl)}<b>${c.n}</b><span>${c.d}</span><span class="meta">${I.cash}${money(c.cash)} ${I.globe}Interpol ${c.interpol} h</span></button>`).join('')}</div>
  ${S && !S.over ? '<div class="act-row"><button class="btn ghost" type="button" data-act="closeOv">Volver a la fuga</button></div>' : ''}`, 'start');
}

export function startGame(id) {
  setS(newGame(id));
  const cr = crime(), c = me();
  news(0, `Golpe consumado en ${c.n}: ${cr.loot}. Tienes ${cr.alarm} h antes de que suene la alarma.`, 'me');
  news(0, `Tu red tiene casas seguras en ${S.safe.map((i) => CITY[i].n).join(', ')}.`, 'me');
  if (S.buyer) news(0, `El comprador del óleo te espera en ${CITY[S.buyer].n}.`, 'me');
  ov().innerHTML = modal('El golpe', `
  <div class="file-no">${clock(0)} · ${esc(c.n)} · Informe reservado</div>
  <h1>${esc(cr.n)}</h1>
  <div class="pato-bubble"><img class="pato-face" src="${face('burlo')}" alt="" width="56" height="56"><p>${esc(quip('burlo'))}</p></div>
  <p class="lead">Saliste de ${esc(c.n)} con <b>${esc(cr.loot)}</b> y ${money(cr.cash)} en efectivo. La alarma suena en ${cr.alarm} ${cr.alarm === 1 ? 'hora' : 'horas'}.</p>
  <p>${esc(cr.d)}</p>
  <dl class="facts"><dt>${I.house}Casas seguras</dt><dd>${S.safe.map((i) => esc(CITY[i].n)).join(', ')}</dd>${S.buyer ? `<dt>${I.pin}Comprador</dt><dd>${esc(CITY[S.buyer].n)}</dd>` : ''}<dt>${I.globe}Interpol</dt><dd>en ${cr.interpol} h</dd></dl>
  <div class="det-bubble"><p><b>McCuack</b> Alerta a todas las unidades: un pato con gorra y lentes oscuros. La ley también tiene patas.</p><img class="det-face" src="${detFace('serio')}" alt="" width="56" height="56"></div>
  <div class="act-row"><button class="btn big" type="button" data-act="begin">Empezar la fuga</button></div>`, 'brief');
  render();
}

export function showEnd() {
  const o = S.over;
  ov().hidden = false;
  ov().innerHTML = modal('Resultado', `
  ${endStamp(o.win)}
  <div class="file-no">${clock(S.hours)} · ${Math.round(S.hours)} h de fuga</div>
  <div class="end-head"><img class="end-face" src="${face(o.win ? 'rie' : 'triste')}" alt="" width="96" height="96"><div><h1>${o.win ? 'Desapareciste' : 'Detenido'}</h1><p class="hero-quip">«${esc(quip(o.win ? 'rie' : 'triste'))}»</p></div></div>
  <p class="lead">${esc(o.msg)}</p>
  ${detBubble()}
  <dl class="facts"><dt>${I.route}Recorrido</dt><dd>${S.path.map((i) => esc(CITY[i].n)).join(' → ')}</dd><dt>${I.target}Rastros descubiertos</dt><dd>${S.traces.filter((t) => t.shown).length}</dd><dt>${I.cash}Efectivo final</dt><dd>${money(Math.max(0, S.cash))}</dd>${o.win ? `<dt>${I.gift}Puntaje</dt><dd><b>${o.pts.toLocaleString('es-CL')}</b></dd>` : ''}</dl>
  <div class="act-row"><button class="btn big" type="button" data-act="crimes">Otro golpe</button><button class="btn ghost" type="button" data-act="viewMap">Ver el recorrido</button></div>`, o.win ? 'end win' : 'end lose');
}

export function begin() { closeOv(); render(); zoomMe(); }
