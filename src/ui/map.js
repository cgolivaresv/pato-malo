// Mapa de fuga: mapa propio en SVG (proyección Mercator) que se arrastra, se pellizca y se acerca.
// Capas, de abajo arriba: retícula, costa, países por zona, calor por país, Andes, rutas,
// ciudades, marcas de la partida y etiquetas sin choques.
import MAP from '../data/map.json';
import { CITIES, CITY, COUNTRIES, CONO, BIG, HUB, inSA } from '../data/geo.js';
import { $, esc } from '../lib/util.js';
import { S, me } from '../game/state.js';
import { heatOf } from '../game/heat.js';
import { zoneRadius, activeChecks } from '../game/pursuit.js';
import { CONTACTS } from '../data/content.js';
import { face, moodOf } from './pato.js';
import { detFace } from './detective.js';

const C = {
  me: '#ff9a3c', meInk: '#1d1105', ink: '#f3ede4', label: '#d9cfd9', dim: '#9d93a3',
  trace: '#ff5b52', safe: '#79d68c', police: '#4aa8ff', halo: '#14111a',
};
const NS_SNOW = '#e9f1ff', NS_ROCK = '#8a7c86';

let svg, ovl, heatG, andesG;
let VB = { x: 0, y: 0, w: MAP.W, h: MAP.H };
let anim = null, lastK = 0, hoverId = null;

// Coordenadas de mapa de un punto {la, lo}
export const P = (c) => [MAP.s * (c.lo * Math.PI) / 180 + MAP.tx, MAP.ty - MAP.s * Math.log(Math.tan(Math.PI / 4 + (c.la * Math.PI) / 360))];
const latOfY = (y) => ((2 * Math.atan(Math.exp((MAP.ty - y) / MAP.s)) - Math.PI / 2) * 180) / Math.PI;
const kNow = () => VB.w / Math.max(1, svg.clientWidth);

// Cresta de los Andes (lat, lon), de Colombia a Magallanes
const ANDES = [[7, -73.4], [5, -75.4], [3, -76.2], [1, -77.4], [-1, -78.5], [-3, -79], [-6, -78.3], [-9, -77.5], [-11, -75.8], [-13, -73.2], [-15, -71.6], [-17.5, -69.6], [-19.5, -68.8], [-21.5, -68.1], [-23.5, -67.7], [-25.5, -68.5], [-27.5, -68.9], [-29.5, -69.9], [-31.5, -70.1], [-33.5, -70.0], [-35.5, -70.4], [-37.5, -71.1], [-39.5, -71.4], [-41.5, -71.8], [-43.5, -71.8], [-45.5, -72.0], [-47.5, -72.8], [-49.5, -73.2], [-51.5, -73.2], [-53.5, -72.3]];

const tierOf = (g) => (g === 'CL' ? 'cl' : CONO.includes(g) ? 'cono' : null);

export function initMap() {
  svg = $('#map');
  const tiers = { cl: '', cono: '', sa: '', w: '' };
  const idOf = {};
  for (const c of MAP.c) {
    const t = tierOf(c.g) || ((c.g && inSA({ c: c.g })) || isSouthAm(c) ? 'sa' : 'w');
    tiers[t] += `<path id="c-${c.id}" d="${c.d}" vector-effect="non-scaling-stroke"/>`;
    if (c.g) idOf[c.g] = c.id;
  }
  MAP.idOf = idOf;

  // Retícula: cada 15°, con el ecuador y los trópicos marcados
  let grat = '';
  for (let lo = -180; lo <= 180; lo += 15) { const x = (MAP.s * lo * Math.PI) / 180 + MAP.tx; grat += `<line x1="${x}" y1="0" x2="${x}" y2="${MAP.H}"/>`; }
  for (let la = -45; la <= 75; la += 15) { const y = P({ la, lo: 0 })[1]; grat += `<line x1="0" y1="${y}" x2="${MAP.W}" y2="${y}"/>`; }
  const lines = [[0, 'Ecuador'], [-23.44, 'Trópico de Capricornio'], [23.44, 'Trópico de Cáncer']]
    .map(([la, n]) => { const y = P({ la, lo: 0 })[1]; return `<line class="special" x1="0" y1="${y}" x2="${MAP.W}" y2="${y}" data-n="${n}" data-y="${y}"/>`; }).join('');

  svg.innerHTML = `<defs><clipPath id="meclip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath></defs>
  <g class="m-grat" vector-effect="non-scaling-stroke">${grat}${lines}</g>
  <g class="m-ripple">${['w', 'sa', 'cono', 'cl'].map((t) => `<use href="#land-${t}"/>`).join('')}</g>
  ${['w', 'sa', 'cono', 'cl'].map((t) => `<g class="m-land t-${t}"><g id="land-${t}">${tiers[t]}</g></g>`).join('')}
  <g id="mHeat" class="m-heat"></g>
  <g id="mAndes" class="m-andes" aria-hidden="true"></g>
  <g id="ovl"></g>`;
  ovl = $('#ovl'); heatG = $('#mHeat'); andesG = $('#mAndes');
  initGestures();
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { setVB(clampVB(VB)); drawOverlay(); }, 150); });
}

// Polígonos sudamericanos que no son países del juego (Guyana, Surinam, Guayana Francesa)
function isSouthAm(c) { return ['328', '740'].includes(c.id); }

// ---------- Dibujo ----------
function arc(a, b, bend = 0.18) {
  const [x1, y1] = P(a), [x2, y2] = P(b);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
  return { d: `M${x1} ${y1}Q${mx - dy * bend} ${my + dx * bend} ${x2} ${y2}`, mx: mx - (dy * bend) / 2, my: my + (dx * bend) / 2 };
}

// Calor por país pintado sobre el mapa
function drawHeat() {
  if (!S) { heatG.innerHTML = ''; return; }
  let h = '';
  for (const g in MAP.idOf) {
    const v = heatOf(g);
    if (v < 10) continue;
    h += `<use href="#c-${MAP.idOf[g]}" fill-opacity="${Math.min(0.42, v / 240).toFixed(3)}"/>`;
  }
  heatG.innerHTML = h;
}

// Montañas de los Andes; en invierno, con nieve en el centro y el sur
function drawAndes(k) {
  if (k > 1.7) { andesG.innerHTML = ''; return; }
  const step = Math.max(0.7, k * 1.1), s = 6 * k;
  let h = '';
  for (let i = 0; i < ANDES.length - 1; i++) {
    const [la1, lo1] = ANDES[i], [la2, lo2] = ANDES[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(la2 - la1, lo2 - lo1) / step));
    for (let j = 0; j < n; j++) {
      const la = la1 + ((la2 - la1) * j) / n, lo = lo1 + ((lo2 - lo1) * j) / n;
      const [x, y] = P({ la, lo });
      const snow = S && S.season === 'invierno' && la < -28 && la > -47;
      const w = s * (0.8 + ((i * 7 + j * 3) % 5) / 10);
      h += `<path d="M${x - w} ${y + s * 0.6}L${x} ${y - s * 0.7}L${x + w} ${y + s * 0.6}" stroke="${snow ? NS_SNOW : NS_ROCK}"/>`;
    }
  }
  andesG.innerHTML = h;
  andesG.setAttribute('stroke-width', 1.3 * k);
}

// Capa de marcas y etiquetas. Se redibuja cuando cambia el zoom o la partida.
export function drawOverlay() {
  if (!ovl) return;
  const k = kNow();
  lastK = k;
  drawHeat();
  drawAndes(k);
  const px = (n) => n * k;
  let lines = '', marks = '', top = '';
  const labels = [], obstacles = [];
  const block = (x, y, r) => obstacles.push({ x0: x - r, x1: x + r, y0: y - r, y1: y + r });
  const label = (x, y, text, o) => labels.push({ x, y, text, ...o });

  // Zona de búsqueda: círculo alrededor del último rastro (radio en km a esa latitud)
  if (S && S.zone && !S.over) {
    const c = CITY[S.zone.city], [x, y] = P(c);
    const r = (zoneRadius() / (6371 * Math.cos((c.la * Math.PI) / 180))) * MAP.s;
    lines += `<circle class="zone" cx="${x}" cy="${y}" r="${r}" stroke-width="${px(1.5)}" stroke-dasharray="${px(6)} ${px(5)}"/>`;
  }
  // Recorrido del pato y ruta al destino elegido
  if (S) {
    for (let i = 1; i < S.path.length; i++) lines += `<path d="${arc(CITY[S.path[i - 1]], CITY[S.path[i]]).d}" class="trail" stroke-width="${px(2.4)}" stroke-dasharray="${px(6)} ${px(5)}"/>`;
    if (S.dest && !S.over) {
      const a = arc(me(), CITY[S.dest], 0.22);
      const km = Math.round(distKm(me(), CITY[S.dest])).toLocaleString('es-CL') + ' km';
      lines += `<path d="${a.d}" class="route" stroke-width="${px(2.2)}" stroke-dasharray="${px(2)} ${px(6)}"/>`;
      const tw = px(km.length * 6.6 + 14);
      const [ax, ay] = P(me()), [bx, by] = P(CITY[S.dest]);
      if (Math.hypot(bx - ax, by - ay) / k > 110) {
      obstacles.push({ x0: a.mx - tw / 2, x1: a.mx + tw / 2, y0: a.my - px(10), y1: a.my + px(10) });
      top += `<g class="pill"><rect x="${a.mx - tw / 2}" y="${a.my - px(10)}" width="${tw}" height="${px(20)}" rx="${px(10)}"/><text x="${a.mx}" y="${a.my + px(4.5)}" font-size="${px(12)}">${km}</text></g>`;
      }
    }
    const po = S.police;
    if (po.city && po.arrive != null && po.target) {
      lines += `<path d="${arc(CITY[po.city], CITY[po.target]).d}" class="cop-route" stroke-width="${px(1.8)}" stroke-dasharray="${px(4)} ${px(4)}"/>`;
    }
  }

  // Ciudades
  const special = new Set();
  if (S) [S.cur, S.dest, S.buyer, ...S.safe, ...S.fenceKnown, ...S.traces.filter((t) => t.shown).map((t) => t.city)].forEach((i) => i && special.add(i));
  for (const c of CITIES) {
    const [x, y] = P(c);
    const big = HUB.has(c.id) || BIG.has(c.id);
    const r = px(big ? 3.4 : 2.6), hit = px(14);
    const sel = S && S.dest === c.id;
    marks += `<g data-id="${c.id}" class="city${sel ? ' sel' : ''}${hoverId === c.id ? ' hov' : ''}"><circle class="hit" cx="${x}" cy="${y}" r="${hit}"/>${big ? `<circle class="ring" cx="${x}" cy="${y}" r="${r + px(2)}" stroke-width="${px(1.2)}"/>` : ''}<circle class="dot" cx="${x}" cy="${y}" r="${sel ? px(4.5) : r}"/></g>`;
    if (S && c.id === S.cur) continue;
    const show = special.has(c.id) || hoverId === c.id
      || (HUB.has(c.id) && k < 2.6) || (BIG.has(c.id) && k < 1.5) || (c.c === 'CL' && k < 1.1) || k < 0.8;
    if (!show) continue;
    const pri = sel ? 95 : hoverId === c.id ? 96 : special.has(c.id) ? 70 : HUB.has(c.id) ? 40 : BIG.has(c.id) ? 35 : c.c === 'CL' ? 25 : 20;
    label(x, y, c.n, { size: sel ? 13.5 : big ? 12.5 : 11.5, pri, cls: sel ? 'l-sel' : big ? 'l-big' : 'l-city', gap: 6, force: sel || hoverId === c.id });
  }

  // Marcas de la partida
  if (S) {
    for (const id of S.safe) { const [x, y] = P(CITY[id]), s = px(4.2); marks += `<path class="safe" d="M${x - s} ${y + s * 0.9}V${y - s * 0.1}L${x} ${y - s}L${x + s} ${y - s * 0.1}V${y + s * 0.9}Z" stroke-width="${px(1.5)}"/>`; }
    for (const id of S.fenceKnown) { const [x, y] = P(CITY[id]); label(x, y + px(13), 'Reducidor', { size: 10.5, pri: 60, cls: 'l-amber', gap: 0, center: true }); }
    if (S.buyer) { const [x, y] = P(CITY[S.buyer]); marks += `<circle class="buyer" cx="${x}" cy="${y}" r="${px(7)}" stroke-width="${px(2)}"/>`; label(x, y + px(15), 'Comprador', { size: 10.5, pri: 88, cls: 'l-amber', gap: 0, center: true, force: true }); }
    const seen = new Set();
    for (const t of S.traces) {
      if (!t.shown || seen.has(t.city)) continue;
      seen.add(t.city);
      const [x, y] = P(CITY[t.city]), s = px(5);
      marks += `<path class="trace" d="M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}" stroke-width="${px(2.6)}"/>`;
    }
    // Controles de McCuack: barrera a rayas
    for (const k of activeChecks()) {
      const [x, y] = P(CITY[k.city]), w = px(11), hh = px(4.2);
      marks += `<g class="chk"><rect x="${x - w}" y="${y - px(12)}" width="${2 * w}" height="${hh}" rx="${px(1)}"/><line x1="${x - w * 0.6}" y1="${y - px(12)}" x2="${x - w * 0.6}" y2="${y - px(5)}" stroke-width="${px(1.4)}"/><line x1="${x + w * 0.6}" y1="${y - px(12)}" x2="${x + w * 0.6}" y2="${y - px(5)}" stroke-width="${px(1.4)}"/></g>`;
      label(x, y - px(18), 'Control', { size: 10.5, pri: 80, cls: 'l-chk', gap: 0, center: true });
    }
    // Contactos encontrados
    const CN = { forger: 'Falsificador', captain: 'Capitán', pilot: 'Piloto' };
    for (const k of Object.keys(CONTACTS)) {
      const ct = S.contacts[k];
      if (!ct.found) continue;
      const [x, y] = P(CITY[ct.city]);
      marks += `<circle class="contact" cx="${x}" cy="${y}" r="${px(7.5)}" stroke-width="${px(2)}"/>`;
      label(x, y + px(16), CN[k], { size: 10.5, pri: 87, cls: 'l-amber', gap: 0, center: true, force: true });
    }
    // Con el soplón: rastros que la PDI está por descubrir
    if (S.hours < S.soplonUntil && !S.over) {
      for (const t of S.traces) {
        if (t.shown) continue;
        const [x, y] = P(CITY[t.city]), s2 = px(4.5);
        marks += `<path class="trace pending" d="M${x - s2} ${y - s2}L${x + s2} ${y + s2}M${x + s2} ${y - s2}L${x - s2} ${y + s2}" stroke-width="${px(2.2)}"/>`;
        label(x, y + px(14), `en ${Math.max(1, Math.round(t.at - S.hours))} h`, { size: 10, pri: 64, cls: 'l-pend', gap: 0, center: true });
      }
    }
    const po = S.police;
    if (po.city) {
      let [x, y] = P(CITY[po.city]);
      const pr = px(11);
      if (po.city === S.cur) { x -= px(26); y -= px(18); }
      block(x, y, pr + px(3));
      top += `<circle cx="${x}" cy="${y}" r="${pr + px(2)}" fill="#0d1626" stroke="${C.police}" stroke-width="${px(2)}"/><image href="${detFace('serio')}" x="${x - pr}" y="${y - pr}" width="${2 * pr}" height="${2 * pr}" clip-path="url(#meclip)" preserveAspectRatio="xMidYMid slice"/>`;
      label(x, y - px(19), 'McCuack', { size: 11, pri: 92, cls: 'l-cop', gap: 0, center: true, force: true });
    }
    // Pato Malo: la cara cambia con su estado de ánimo
    const [x, y] = P(me()), r = px(14);
    block(x, y, r + px(3));
    top += `<circle class="pulse" cx="${x}" cy="${y}" r="${px(8)}" fill="${C.me}"/><circle cx="${x}" cy="${y}" r="${r + px(2.2)}" fill="#201b26" stroke="${C.me}" stroke-width="${px(2.2)}"/><image href="${face(moodOf())}" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" clip-path="url(#meclip)" preserveAspectRatio="xMidYMin slice"/>`;
    label(x, y, me().n, { size: 14, pri: 100, cls: 'l-me', gap: 20, force: true });
  }

  // Nombres de países
  for (const c of MAP.c) {
    if (!c.g) continue;
    const bigC = ['BR', 'AR', 'RU', 'CN', 'US', 'CA', 'AU', 'IN'].includes(c.g);
    const limit = bigC ? 3.2 : c.g === 'CL' ? 2.4 : inSA({ c: c.g }) ? 2 : 1.4;
    if (k > limit) continue;
    const name = COUNTRIES[c.g].n.toUpperCase();
    if (c.g === 'CL') { const [x, y] = P({ la: -36, lo: -76.5 }); label(x, y, name, { size: 12, pri: 30, cls: 'l-country', rot: -90, center: true }); continue; }
    label(c.lx, c.ly, name, { size: bigC ? 15 : 12, pri: 30, cls: 'l-country', center: true });
  }

  ovl.innerHTML = `<g class="m-lines">${lines}</g><g class="m-marks">${marks}</g>${placeLabels(labels, k, obstacles)}<g class="m-top">${top}</g>`;
  drawDecor();
}

// Ubica etiquetas por prioridad sin que se pisen (las forzadas siempre se muestran)
function placeLabels(items, k, obstacles = []) {
  const boxes = [...obstacles];
  const hits = (b) => boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  let out = '';
  items.sort((a, b) => b.pri - a.pri);
  for (const it of items) {
    const fs = it.size * k, w = it.text.length * fs * (it.cls === 'l-country' ? 0.62 : 0.57), h = fs * 1.1, g = it.gap * k;
    const tries = it.rot
      ? [[it.x - h / 2, it.y - w / 2, 'middle']]
      : it.center
        ? [[it.x, it.y, 'middle']]
        : [[it.x + g, it.y, 'start'], [it.x - g, it.y, 'end'], [it.x, it.y - g - h * 0.4, 'middle'], [it.x, it.y + g + h * 0.9, 'middle']];
    const boxOf = ([tx, ty, anchor]) => {
      if (it.rot) return { x0: tx, x1: tx + h, y0: ty, y1: ty + w };
      const x0 = anchor === 'start' ? tx : anchor === 'end' ? tx - w : tx - w / 2;
      return { x0, x1: x0 + w, y0: ty - h * 0.75, y1: ty + h * 0.25 };
    };
    let pick = tries.find((t) => !hits(boxOf(t)));
    if (!pick && it.force) pick = tries[0];
    for (const [tx, ty, anchor] of pick ? [pick] : []) {
      let b;
      if (it.rot) b = { x0: tx, x1: tx + h, y0: ty, y1: ty + w };
      else {
        const x0 = anchor === 'start' ? tx : anchor === 'end' ? tx - w : tx - w / 2;
        b = { x0, x1: x0 + w, y0: ty - h * 0.75, y1: ty + h * 0.25 };
      }
      boxes.push(b);
      const yy = it.rot ? it.y : ty + fs * 0.35;
      const tr = it.rot ? ` transform="rotate(${it.rot} ${it.x} ${it.y})"` : '';
      out += `<text class="${it.cls}" x="${it.rot ? it.x : tx}" y="${yy}" text-anchor="${anchor}" font-size="${fs}" stroke-width="${3.2 * k}"${tr}>${esc(it.text)}</text>`;
      break;
    }
  }
  return `<g class="m-labels">${out}</g>`;
}

// Escala y nombres de las líneas especiales (dependen de la vista, no de la partida)
function drawDecor() {
  const k = kNow();
  // Escala: km por píxel a la latitud del centro de la vista
  const lat = latOfY(VB.y + VB.h / 2);
  const kmPerPx = (k * 6371 * Math.cos((lat * Math.PI) / 180)) / MAP.s;
  const target = kmPerPx * 90, pow = 10 ** Math.floor(Math.log10(target));
  const nice = [1, 2, 5, 10].map((m) => m * pow).filter((v) => v <= target).pop() || pow;
  const bar = $('#scaleBar');
  if (bar) { bar.style.width = `${Math.round(nice / kmPerPx)}px`; $('#scaleTxt').textContent = `${nice.toLocaleString('es-CL')} km`; }
  // Nombres del ecuador y los trópicos, pegados al borde izquierdo de la vista
  const sp = svg.querySelectorAll('.m-grat .special');
  let t = '';
  sp.forEach((l) => { const y = +l.dataset.y; if (y > VB.y && y < VB.y + VB.h) t += `<text x="${VB.x + 74 * k}" y="${y - 4 * k}" font-size="${10 * k}">${l.dataset.n}</text>`; });
  let g = svg.querySelector('#mLines');
  if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.id = 'mLines'; g.setAttribute('class', 'm-linelabels'); svg.insertBefore(g, svg.querySelector('.m-ripple')); }
  g.innerHTML = t;
}

function distKm(a, b) {
  const r = Math.PI / 180, dl = (b.la - a.la) * r, dn = (b.lo - a.lo) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a.la * r) * Math.cos(b.la * r) * Math.sin(dn / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// ---------- Vista ----------
const MIN_W = 70, MAX_W = MAP.W * 1.15;
function clampVB(v) {
  const ar = svg.clientWidth / Math.max(1, svg.clientHeight);
  let w = Math.min(MAX_W, Math.max(MIN_W, v.w)), h = w / ar;
  const cx = Math.min(MAP.W, Math.max(0, v.x + v.w / 2)), cy = Math.min(MAP.H, Math.max(0, v.y + v.h / 2));
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function setVB(v) {
  VB = v;
  svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  const k = kNow();
  // Al desplazar sin cambiar el zoom, las marcas no cambian de tamaño: no hace falta redibujarlas
  if (!lastK || Math.abs(k - lastK) / lastK > 0.004) drawOverlay();
  else drawDecor();
}

// Encuadre que contiene los puntos dados, respetando la proporción del mapa en pantalla
export function fit(pts, minW) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  let w = Math.max(x1 - x0, minW), h = Math.max(y1 - y0, minW * 0.6);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  w *= 1.3; h *= 1.3;
  const ar = svg.clientWidth / Math.max(1, svg.clientHeight);
  if (w / h < ar) w = h * ar; else h = w / ar;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

function animateTo(t) {
  if (anim) cancelAnimationFrame(anim);
  t = clampVB(t);
  const f = { ...VB }, t0 = performance.now(), D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
  const st = (n) => {
    const p = D ? Math.min(1, (n - t0) / D) : 1, e = 1 - Math.pow(1 - p, 3);
    setVB({ x: f.x + (t.x - f.x) * e, y: f.y + (t.y - f.y) * e, w: f.w + (t.w - f.w) * e, h: f.h + (t.h - f.h) * e });
    if (p < 1) anim = requestAnimationFrame(st);
    else drawOverlay();
  };
  anim = requestAnimationFrame(st);
}

export function zoomMe() {
  if (!S) { animateTo(fit([P({ la: -10, lo: -80 }), P({ la: -56, lo: -55 })], 300)); return; }
  const pts = [P(me())];
  if (S.dest) pts.push(P(CITY[S.dest]));
  if (!inSA(me()) || (S.dest && !inSA(CITY[S.dest]))) animateTo(fit(pts, 500));
  else animateTo(fit([...pts, P({ la: me().la + 9, lo: me().lo + 7 }), P({ la: me().la - 9, lo: me().lo - 7 })], 250));
}
export function zoomWorld() { animateTo(fit([[0, 40], [MAP.W, MAP.H - 40]], MAP.W)); }
export function zoomStart() { setVB(clampVB(fit([P({ la: 15, lo: -120 }), P({ la: -56, lo: -30 })], 300))); drawOverlay(); }
export function zoomBy(f) {
  const cx = VB.x + VB.w / 2, cy = VB.y + VB.h / 2;
  animateTo({ x: cx - (VB.w * f) / 2, y: cy - (VB.h * f) / 2, w: VB.w * f, h: VB.h * f });
}

// ---------- Gestos: arrastrar, pellizcar, rueda y doble toque ----------
let suppressClick = false;
function initGestures() {
  const pts = new Map();
  let start = null, moved = 0, raf = 0, pending = null;
  const toMap = (cx, cy) => {
    const r = svg.getBoundingClientRect();
    return [VB.x + ((cx - r.left) / r.width) * VB.w, VB.y + ((cy - r.top) / r.height) * VB.h];
  };
  const apply = (v) => { pending = v; if (!raf) raf = requestAnimationFrame(() => { raf = 0; setVB(clampVB(pending)); }); };
  const snapshot = () => {
    const arr = [...pts.values()];
    const mid = arr.length > 1 ? [(arr[0].x + arr[1].x) / 2, (arr[0].y + arr[1].y) / 2] : [arr[0].x, arr[0].y];
    const dist = arr.length > 1 ? Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) : 0;
    start = { vb: { ...VB }, mid, dist, anchor: toMap(...mid) };
  };

  svg.addEventListener('pointerdown', (e) => {
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* algunos navegadores no lo permiten; el gesto sigue igual */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) moved = 0;
    snapshot();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) {
      // Pasar el mouse sobre una ciudad muestra su nombre
      const g = e.target.closest && e.target.closest('g[data-id]');
      const id = g ? g.dataset.id : null;
      if (id !== hoverId && e.pointerType === 'mouse') { hoverId = id; drawOverlay(); }
      return;
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = svg.getBoundingClientRect(), arr = [...pts.values()];
    if (arr.length === 1) {
      const dx = arr[0].x - start.mid[0], dy = arr[0].y - start.mid[1];
      moved = Math.max(moved, Math.hypot(dx, dy));
      if (moved < 4) return;
      apply({ ...start.vb, x: start.vb.x - (dx / r.width) * start.vb.w, y: start.vb.y - (dy / r.height) * start.vb.h });
    } else {
      moved = 99;
      const mid = [(arr[0].x + arr[1].x) / 2, (arr[0].y + arr[1].y) / 2];
      const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) || 1;
      const f = start.dist / d, w = start.vb.w * f, h = start.vb.h * f;
      const fx = (mid[0] - r.left) / r.width, fy = (mid[1] - r.top) / r.height;
      apply({ x: start.anchor[0] - fx * w, y: start.anchor[1] - fy * h, w, h });
    }
  });
  const end = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (moved >= 4) suppressClick = true;
    if (pts.size) snapshot();
    else drawOverlay();
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('pointerleave', () => { if (hoverId && !pts.size) { hoverId = null; drawOverlay(); } });
  // Un arrastre no debe contar como toque sobre una ciudad
  svg.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, true);

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    const f = Math.exp(Math.max(-0.5, Math.min(0.5, e.deltaY * (e.deltaMode ? 0.05 : 0.0018))));
    const [mx, my] = toMap(e.clientX, e.clientY);
    apply({ x: mx - (mx - VB.x) * f, y: my - (my - VB.y) * f, w: VB.w * f, h: VB.h * f });
  }, { passive: false });

  svg.addEventListener('dblclick', (e) => {
    e.preventDefault();
    const [mx, my] = toMap(e.clientX, e.clientY), f = 0.5;
    animateTo({ x: mx - (mx - VB.x) * f, y: my - (my - VB.y) * f, w: VB.w * f, h: VB.h * f });
  });
}
