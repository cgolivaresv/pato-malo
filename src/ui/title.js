// Pantalla de inicio.
// Fase 1: escena nocturna (alarma, sirenas, lluvia, Pato Malo entra corriendo, McCuack se asoma).
// Fase 2: la cámara se aleja y queda el mapa de fuga en bucle: una ruta de escape se traza
// ciudad por ciudad mientras McCuack la sigue. Encima, el menú.
import { CITY } from '../data/geo.js';
import { $, esc, store } from '../lib/util.js';
import { PATO, face } from './pato.js';
import { MCCUACK, detFace } from './detective.js';
import { P } from './map.js';

const ROUTES = [
  ['talca', 'santiago', 'mendoza', 'cordoba', 'asuncion', 'brasilia'],
  ['antofagasta', 'calama', 'uyuni', 'lapaz', 'cusco', 'lima'],
  ['puertomontt', 'bariloche', 'neuquen', 'buenosaires', 'montevideo'],
  ['concepcion', 'temuco', 'valdivia', 'puertomontt', 'castro', 'coyhaique', 'natales', 'puntaarenas'],
  ['arica', 'tacna', 'arequipa', 'lima', 'quito', 'bogota'],
  ['valparaiso', 'santiago', 'laserena', 'copiapo', 'salta', 'santacruz'],
];
const SPEED = 75; // unidades de mapa por segundo
const CHASE = 2.2; // segundos de ventaja del pato sobre McCuack

let raf = 0, timers = [], onPlay = null, live = false;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const later = (fn, ms) => timers.push(setTimeout(fn, ms));

// Siluetas de edificios con ventanas encendidas al azar
function skyline() {
  let x = 0, h = '';
  while (x < 1200) {
    const w = 40 + Math.random() * 70, ht = 90 + Math.random() * 190;
    h += `<rect x="${x}" y="${300 - ht}" width="${w}" height="${ht}"/>`;
    for (let wy = 300 - ht + 14; wy < 290; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 14) if (Math.random() < 0.18) h += `<rect class="win" x="${wx}" y="${wy}" width="6" height="9"/>`;
    x += w + 4 + Math.random() * 10;
  }
  return `<svg class="ti-city" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${h}</svg>`;
}

export function showTitle(play) {
  onPlay = play;
  const car = store('fuga-career') || { escapes: 0, played: 0, points: 0 };
  const el = document.createElement('div');
  el.id = 'title';
  el.className = 'title';
  el.innerHTML = `
  <div class="ti-map" aria-hidden="true"><svg id="tiMap"></svg></div>
  <div class="ti-scene" aria-hidden="true">
    <div class="ti-sky"></div>
    ${skyline()}
    <div class="ti-siren red"></div><div class="ti-siren blue"></div>
    <div class="ti-street"></div>
    <div class="ti-rain"></div><div class="ti-rain far"></div>
    <div class="ti-tape"><span>Escena del crimen · No pasar · Escena del crimen · No pasar · Escena del crimen · No pasar ·</span></div>
    <div class="ti-alarm">¡Alarma!</div>
    <div class="ti-beam"></div>
    <img class="ti-cop" src="${MCCUACK}" alt="" width="450" height="745">
    <img class="ti-pato" src="${PATO}" alt="" width="328" height="457">
  </div>
  <div class="ti-ui">
    <div class="ti-logo"><div class="ti-stamp">Pato Malo</div><p class="ti-tag">«Nadie atrapa a un pato con estilo.»</p></div>
    <div class="ti-menu">
      <button type="button" class="btn big ti-play" data-act="titlePlay">Jugar</button>
      <p class="ti-rec">${car.played ? `${car.escapes} de ${car.played} fugas exitosas · ${car.points.toLocaleString('es-CL')} pts` : 'Escapa de la PDI por Chile, Sudamérica y el mundo'}</p>
      <div class="ti-vs"><img src="${face('burlo')}" alt="" width="34" height="34"><span>vs</span><img src="${detFace('serio')}" alt="" width="34" height="34"><small>Detective Patrick McCuack · «La ley también tiene patas»</small></div>
    </div>
  </div>
  <button type="button" class="ti-skip" data-act="titleSkip">Saltar intro</button>`;
  document.body.appendChild(el);
  live = true;
  initMap();
  if (reduced()) { toMap(true); return; }
  el.classList.add('intro');
  later(() => el.classList.add('cop'), 1700);
  later(() => el.classList.add('stamped'), 2100);
  later(() => el.classList.add('flee'), 3600);
  later(() => toMap(false), 4100);
}

// Pasa de la escena nocturna al mapa vivo
export function skipTitleIntro() { if (live) toMap(true); }
function toMap(now) {
  const el = $('#title');
  if (!el || el.classList.contains('onmap')) return;
  timers.forEach(clearTimeout); timers = [];
  el.classList.add('onmap', 'stamped');
  if (now) el.classList.add('instant');
  startRoute();
}

export function playFromTitle() {
  const el = $('#title');
  if (!el) return;
  live = false;
  cancelAnimationFrame(raf);
  timers.forEach(clearTimeout); timers = [];
  el.classList.add('leaving');
  setTimeout(() => el.remove(), 380);
  if (onPlay) onPlay();
}

// ---------- Mapa vivo ----------
let svg, vb = null;
function initMap() {
  svg = $('#tiMap');
  // Reutiliza los contornos del mapa del juego
  svg.innerHTML = `<g class="m-ripple">${['w', 'sa', 'cono', 'cl'].map((t) => `<use href="#land-${t}"/>`).join('')}</g>
  ${['w', 'sa', 'cono', 'cl'].map((t) => `<g class="m-land t-${t}"><use href="#land-${t}"/></g>`).join('')}
  <g id="tiRoute"></g>`;
}

// Curva suave que pasa por las ciudades
function routePath(ids) {
  const p = ids.map((id) => P(CITY[id]));
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length; i++) {
    const [x1, y1] = p[i - 1], [x2, y2] = p[i], dx = x2 - x1, dy = y2 - y1, b = 0.16 * (i % 2 ? 1 : -1);
    d += `Q${(x1 + x2) / 2 - dy * b} ${(y1 + y2) / 2 + dx * b} ${x2} ${y2}`;
  }
  return { d, pts: p };
}

let routeN = Math.floor(Math.random() * ROUTES.length);
function startRoute() {
  if (!live) return;
  const ids = ROUTES[routeN++ % ROUTES.length];
  const { d, pts } = routePath(ids);
  const g = $('#tiRoute');
  g.innerHTML = `<path id="tiPath" d="${d}" class="ti-trail-bg"/><path id="tiDone" d="${d}" class="ti-trail"/>
  <g id="tiMarks"></g><g id="tiCop"></g><g id="tiMe"></g>`;
  const path = $('#tiPath'), done = $('#tiDone'), L = path.getTotalLength();
  done.style.strokeDasharray = `${L} ${L}`;
  // Distancia a lo largo de la ruta en que se pasa por cada ciudad
  const at = pts.map(([x, y]) => {
    let best = 0, bd = Infinity;
    for (let s = 0; s <= L; s += 3) { const q = path.getPointAtLength(s), dd = (q.x - x) ** 2 + (q.y - y) ** 2; if (dd < bd) { bd = dd; best = s; } }
    return best;
  });
  const marks = $('#tiMarks');
  const faceAt = (id, img, r, cls) => `<g class="${cls}"><circle r="${r + 2}"/><image href="${img}" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" clip-path="url(#meclip)" preserveAspectRatio="xMidYMin slice"/></g>`;
  $('#tiMe').innerHTML = faceAt('me', face('burlo'), 13, 'ti-me');
  $('#tiCop').innerHTML = faceAt('cop', detFace('serio'), 11, 'ti-copf');
  const me = $('#tiMe'), cop = $('#tiCop');
  let shown = 0;
  const t0 = performance.now(), total = L / SPEED, still = reduced();

  const frame = (now) => {
    if (!live) return;
    const t = still ? total + CHASE : (now - t0) / 1000;
    const s = Math.min(L, t * SPEED), sc = Math.max(0, Math.min(L, (t - CHASE) * SPEED));
    const q = path.getPointAtLength(s), qc = path.getPointAtLength(sc);
    done.style.strokeDashoffset = L - s;
    const ar = svg.clientWidth / Math.max(1, svg.clientHeight);
    const w = ar < 1 ? 400 : 700, h = w / ar, k = w / Math.max(1, svg.clientWidth);
    me.setAttribute('transform', `translate(${q.x} ${q.y}) scale(${k * 1.15})`);
    cop.setAttribute('transform', `translate(${qc.x} ${qc.y}) scale(${k})`);
    cop.style.opacity = t > CHASE * 0.6 ? 1 : 0;
    // Una X roja aparece cuando McCuack descubre que el pato pasó por ahí
    while (shown < ids.length && at[shown] <= sc + 1) {
      const [x, y] = pts[shown], n = CITY[ids[shown]].n;
      marks.insertAdjacentHTML('beforeend', `<g class="ti-x" transform="translate(${x} ${y}) scale(${k})"><path d="M-5 -5L5 5M5 -5L-5 5"/><text x="9" y="4">${esc(n)}</text></g>`);
      shown++;
    }
    // Cámara: sigue al pato con suavidad
    // En teléfono el título ocupa arriba y el menú abajo: el pato queda en la franja del medio
    const tx = q.x - w / 2, ty = q.y - h * (ar < 1 ? 0.47 : 0.5);
    vb = vb && !still ? { x: vb.x + (tx - vb.x) * 0.05, y: vb.y + (ty - vb.y) * 0.05 } : { x: tx, y: ty };
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${w} ${h}`);
    if (still) return;
    if (t < total + CHASE + 1.6) raf = requestAnimationFrame(frame);
    else { $('#tiRoute').classList.add('fade'); later(() => { $('#tiRoute').classList.remove('fade'); startRoute(); }, 600); }
  };
  raf = requestAnimationFrame(frame);
}
