// Ventanas superpuestas: elegir golpe, informe del golpe y resultado.
import { CITY } from '../data/geo.js';
import { $, esc, money, clock, store } from '../lib/util.js';
import { S, setS, newGame, crime, me } from '../game/state.js';
import { news } from '../game/engine.js';
import { render } from './render.js';
import { zoomMe } from './map.js';
import { PATO, face, quip } from './pato.js';
import { MCCUACK, DET_NAME, MOTTO, detBubble, detFace, detQuip } from './detective.js';
import { I } from './icons.js';
import { endStamp } from './fx.js';
import { currentEvent, eventChoices } from '../game/events.js';
import { decision, chips } from './components.js';
import { maybeTutorial } from './tutorial.js';
import { sfx, music } from '../audio/sound.js';
import { showCrimes, takeHeist, xpBlock } from './heistui.js';

const ov = () => $('#ov');
const modal = (label, inner, cls = '') => `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${label}"><div class="tape" aria-hidden="true"></div><div class="in">${inner}</div></div>`;

export function closeOv() { ov().hidden = true; ov().innerHTML = ''; ov().dataset.ev = ''; }

const STARS = (n) => `<span class="lvl" aria-label="Dificultad ${n} de 5">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5 - n)}</span>`;

export { showCrimes };

// Empieza la fuga con el golpe recién dado (planGo en heistui.js)
export function startGame() {
  const h = takeHeist();
  if (!h) { showCrimes(); return; }
  setS(newGame(h.id, h.setup));
  const cr = crime(), c = me();
  const st = CITY[S.start];
  news(0, `Golpe ${S.heist.outcome === 'clean' ? 'limpio' : S.heist.outcome === 'witness' ? 'con testigos' : 'con la alarma sonando'} en ${st.n}: ${cr.loot}. La alarma suena en ${cr.alarm} h.`, 'me');
  if (S.cur !== S.start) news(S.hours, `Escapaste del lugar y llegaste a ${c.n}.`, 'me');
  news(0, `Tu red tiene casas seguras en ${S.safe.map((i) => CITY[i].n).join(', ')}.`, 'me');
  if (S.buyer) news(0, `El comprador del óleo te espera en ${CITY[S.buyer].n}.`, 'me');
  S.unread = 0; // el informe ya lo cuenta
  ov().innerHTML = modal('El golpe', `
  <div class="file-no">${clock(S.hours)} · ${esc(c.n)} · Informe reservado</div>
  <h1>${esc(cr.n)}</h1>
  <div class="pato-bubble"><img class="pato-face" src="${face('burlo')}" alt="" width="56" height="56"><p>${esc(quip('burlo'))}</p></div>
  <p class="lead">Saliste de ${esc(st.n)} con <b>${esc(cr.loot)}</b> y ${money(cr.cash)} en efectivo.${S.cur !== S.start ? ` Ya estás en <b>${esc(c.n)}</b>.` : ''} ${cr.alarm <= S.hours ? 'La alarma ya está sonando.' : `La alarma suena a las ${clock(cr.alarm).split(' ')[1]}.`}</p>
  <p>${esc(cr.d)}</p>
  <p class="hint">${cr.obj.includes('cross') ? `Cruza la frontera y llega a una casa segura fuera de Chile: <b>${S.safe.filter((i) => CITY[i].c !== 'CL').map((i) => esc(CITY[i].n)).join(', ')}</b>.` : 'Para salir del continente arma tu plan en la hoja <b>Escape</b>: busca al capitán, al piloto o al falsificador maestro.'}</p>
  <dl class="facts"><dt>${I.house}Casas seguras</dt><dd>${S.safe.map((i) => esc(CITY[i].n)).join(', ')}</dd>${S.buyer ? `<dt>${I.pin}Comprador</dt><dd>${esc(CITY[S.buyer].n)}</dd>` : ''}<dt>${I.globe}Interpol</dt><dd>${isFinite(cr.interpol) ? `en ${cr.interpol} h` : 'No entra al caso'}</dd><dt>${S.season === 'invierno' ? I.snow : I.sun}Estación</dt><dd>${S.season === 'invierno' ? 'Invierno: la nieve cierra los pasos a Argentina en el centro y sur' : 'Verano: los pasos cordilleranos están abiertos'}</dd></dl>
  <div class="det-bubble"><p><b>McCuack</b> ${esc(detQuip('inicio'))}</p><img class="det-face" src="${detFace('serio')}" alt="" width="56" height="56"></div>
  <div class="act-row"><button class="btn big" type="button" data-act="begin">Empezar la fuga</button></div>`, 'brief');
  render();
}

export function showEnd() {
  const o = S.over;
  music(false);
  sfx(o.win ? 'win' : 'lose');
  ov().hidden = false;
  ov().innerHTML = modal('Resultado', `
  ${endStamp(o.win)}
  <div class="file-no">${clock(S.hours)} · ${Math.round(S.hours)} h de fuga</div>
  <div class="end-head"><img class="end-face" src="${face(o.win ? 'rie' : 'triste')}" alt="" width="96" height="96"><div><h1>${o.win ? 'Desapareciste' : 'Detenido'}</h1><p class="hero-quip">«${esc(quip(o.win ? 'rie' : 'triste'))}»</p></div></div>
  <p class="lead">${esc(o.msg)}</p>
  ${detBubble()}
  <dl class="facts"><dt>${I.route}Recorrido</dt><dd>${S.path.map((i) => esc(CITY[i].n)).join(' → ')}</dd><dt>${I.target}Rastros descubiertos</dt><dd>${S.traces.filter((t) => t.shown).length}</dd><dt>${I.cash}Efectivo final</dt><dd>${money(Math.max(0, S.cash))}</dd>${o.win ? `<dt>${I.gift}Puntaje</dt><dd><b>${o.pts.toLocaleString('es-CL')}</b></dd>` : ''}</dl>
  ${xpBlock(o.career)}
  <div class="act-row"><button class="btn big" type="button" data-act="crimes">Otro golpe</button><button class="btn ghost" type="button" data-act="viewMap">Ver el recorrido</button></div>`, o.win ? 'end win' : 'end lose');
}

export function begin() { closeOv(); render(); zoomMe(); setTimeout(maybeTutorial, 700); }

// Ventana de evento: situación, opciones con su costo y riesgo, y luego el resultado
export function showEvent() {
  const e = currentEvent();
  if (!e || S.over) return;
  const done = S.event.result != null;
  const key = `${e.id}-${S.evCount}-${done ? 'r' : 'q'}`;
  if (!ov().hidden && ov().dataset.ev === key) return;
  ov().dataset.ev = key;
  if (!done) sfx('event');
  ov().hidden = false;
  const img = e.face === 'det' ? detFace(done ? 'burlon' : 'serio') : face(done ? 'burlo' : e.mood || 'normal');
  const imgCls = e.face === 'det' ? 'det-face' : 'pato-face';
  const body = done
    ? `<p class="lead ev-result">${esc(S.event.result)}</p><div class="act-row"><button class="btn big" type="button" data-act="eventClose">Seguir</button></div>`
    : `<p class="lead">${esc(e.text(S.event.vals, S.event.ctx))}</p><div class="g-list">${eventChoices().map((c, i) => decision({
      act: 'eventChoice', arg: i, icon: `<b class="ev-n">${i + 1}</b>`, title: esc(c.label), desc: esc(c.desc),
      chipsHtml: chips(c.chips || {}), disabled: !!(c.need && S.cash < c.need), why: c.need && S.cash < c.need ? `Te faltan ${money(c.need - S.cash)}` : '',
    })).join('')}</div>`;
  ov().innerHTML = modal('Evento', `
  <div class="ev-head"><img class="${imgCls}" src="${img}" alt="" width="64" height="64"><div><div class="file-no">${clock(S.hours)} · ${esc(me().n)}</div><h1 class="ev-title">${esc(e.title)}</h1></div></div>
  ${body}`, 'event');
}
