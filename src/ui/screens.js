// Ventanas superpuestas: elegir golpe, informe del golpe y resultado.
import { CITY } from '../data/geo.js';
import { CRIMES } from '../data/content.js';
import { $, esc, money, clock, store } from '../lib/util.js';
import { S, setS, newGame, crime, me } from '../game/state.js';
import { news } from '../game/engine.js';
import { render } from './render.js';
import { zoomMe } from './map.js';

const ov = () => $('#ov');
const modal = (label, inner) => `<div class="modal" role="dialog" aria-label="${label}"><div class="bar"></div><div class="in">${inner}</div></div>`;

export function closeOv() { ov().hidden = true; ov().innerHTML = ''; }

export function showCrimes() {
  const car = store('fuga-career') || { escapes: 0, played: 0, points: 0 };
  ov().hidden = false;
  ov().innerHTML = modal('Elegir golpe', `
  <div class="small mono">FUGAS EXITOSAS ${car.escapes}/${car.played} · ${car.points.toLocaleString('es-CL')} PTS</div>
  <h1>Pato Malo</h1>
  <p>Acabas de dar el golpe en una ciudad de Chile. Ahora la PDI te busca. Cada cosa que haces puede dejar un rastro que la policía descubre horas después, y la brigada viaja hacia el último lugar donde supo de ti.</p>
  <ul class="rules">
    <li>No ves a la policía. Te enteras de lo que saben por las noticias, o pagando a un soplón.</li>
    <li>Volar con tu documento real los lleva directo a ti. El bus y los pasos clandestinos son más lentos pero más silenciosos.</li>
    <li>El <b>calor</b> sube con cada rastro descubierto y hace más peligrosos los controles. Baja cuando te escondes.</li>
    <li>Si la brigada llega a tu ciudad, cada hora ahí es un riesgo. Una casa segura es el mejor escondite.</li>
    <li>¿Sin plata? Vende tus cosas o parte del botín, haz encargos para bandas, asalta o pide al usurero. Todo deja huella.</li>
    <li>Cada 24 horas sin ser atrapado ganas una recompensa: dinero u objetos útiles.</li>
  </ul>
  <div class="crimes">${CRIMES.map((c) => `<button class="crime" type="button" data-act="start" data-arg="${c.id}"><span class="stars">${'■'.repeat(c.lvl)}${'□'.repeat(5 - c.lvl)}</span><b>${c.n}</b><span class="small">${c.d}</span><span class="meta"><span>${money(c.cash)} en mano</span><span>Interpol ${c.interpol} h</span></span></button>`).join('')}</div>
  ${S && !S.over ? '<div class="act"><button class="btn ghost" type="button" data-act="closeOv">Volver a la fuga</button></div>' : ''}`);
}

export function startGame(id) {
  setS(newGame(id));
  const cr = crime(), c = me();
  news(0, `Golpe consumado en ${c.n}: ${cr.loot}. Tienes ${cr.alarm} h antes de que suene la alarma.`, 'me');
  news(0, `Tu red tiene casas seguras en ${S.safe.map((i) => CITY[i].n).join(', ')}.`, 'me');
  if (S.buyer) news(0, `El comprador del óleo te espera en ${CITY[S.buyer].n}.`, 'me');
  ov().innerHTML = modal('El golpe', `
  <div class="small mono">${clock(0).toUpperCase()} · ${esc(c.n.toUpperCase())}</div>
  <h1>${esc(cr.n)}</h1>
  <p>Saliste de ${esc(c.n)} con <b>${esc(cr.loot)}</b> y ${money(cr.cash)} en efectivo. La alarma suena en ${cr.alarm} horas.</p>
  <p>${esc(cr.d)}</p>
  <div class="score"><span>Casas seguras</span><span>${S.safe.map((i) => esc(CITY[i].n)).join(', ')}</span>${S.buyer ? `<span>Comprador</span><span>${esc(CITY[S.buyer].n)}</span>` : ''}<span>Interpol</span><span>en ${cr.interpol} h</span></div>
  <div class="act"><button class="btn" type="button" data-act="begin">Empezar la fuga</button></div>`);
  render();
}

export function showEnd() {
  const o = S.over;
  ov().hidden = false;
  ov().innerHTML = modal('Resultado', `
  <div class="small mono">${clock(S.hours).toUpperCase()} · ${Math.round(S.hours)} H DE FUGA</div>
  <h1>${o.win ? 'Desapareciste' : 'Detenido'}</h1><p>${esc(o.msg)}</p>
  <div class="score"><span>Recorrido</span><span>${S.path.map((i) => esc(CITY[i].n)).join(' → ')}</span><span>Rastros descubiertos</span><span>${S.traces.filter((t) => t.shown).length}</span><span>Efectivo final</span><span>${money(Math.max(0, S.cash))}</span>${o.win ? `<span><b>Puntaje</b></span><span><b>${o.pts.toLocaleString('es-CL')}</b></span>` : ''}</div>
  <div class="act"><button class="btn" type="button" data-act="crimes">Otro golpe</button><button class="btn ghost" type="button" data-act="viewMap">Ver el mapa</button></div>`);
}

export function begin() { closeOv(); render(); zoomMe(); }
