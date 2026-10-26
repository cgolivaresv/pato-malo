// Mapa SVG en proyección Mercator, con zoom animado.
import MAP from '../data/map.json';
import { CITIES, CITY, inSA } from '../data/geo.js';
import { $, esc } from '../lib/util.js';
import { S, me } from '../game/state.js';
import { face, moodOf } from './pato.js';

const C = { sea: '#100e14', me: '#ff9a3c', meInk: '#1d1105', ink: '#f1ebe4', dot: '#b9adb9', trace: '#ff5d5d', safe: '#7bd88f', police: '#4aa8ff' };

let svg;
let VB = { x: 0, y: 0, w: MAP.W, h: MAP.H };
let anim = null;

// Coordenadas de pantalla de una ciudad
export const P = (c) => [MAP.s * (c.lo * Math.PI) / 180 + MAP.tx, MAP.ty - MAP.s * Math.log(Math.tan(Math.PI / 4 + (c.la * Math.PI) / 360))];

export function initMap() {
  svg = $('#map');
  let g = `<rect x="-4000" y="-4000" width="10000" height="10000" fill="${C.sea}"/><g>`;
  for (let lo = -180; lo <= 180; lo += 30) { const x = (MAP.s * lo * Math.PI) / 180 + MAP.tx; g += `<line class="grat" x1="${x}" y1="0" x2="${x}" y2="${MAP.H}"/>`; }
  for (let la = -60; la <= 75; la += 15) { const y = P({ la, lo: 0 })[1]; g += `<line class="grat" x1="0" y1="${y}" x2="${MAP.W}" y2="${y}"/>`; }
  g += '</g>';
  for (const k of ['o', 'sa', 'lim', 'cl']) g += `<path class="${k}" d="${MAP.g[k]}"/>`;
  // Recorte circular para la cara del pato en el mapa
  const defs = '<defs><clipPath id="meclip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath></defs>';
  svg.innerHTML = defs + g + '<g id="ovl"></g>';
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawOverlay, 150); });
}

// Curva suave entre dos ciudades
function arc(a, b) {
  const [x1, y1] = P(a), [x2, y2] = P(b);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, k = 0.18;
  return `M${x1} ${y1}Q${mx - dy * k} ${my + dx * k} ${x2} ${y2}`;
}

// Capa de marcas: ciudades, recorrido, rastros, casas seguras, policía y tu posición
export function drawOverlay() {
  const o = $('#ovl');
  if (!o) return;
  const k = VB.w / Math.max(1, svg.clientWidth);
  const lbl = (x, y, t, col, sz = 11.5) => `<text x="${x + 8 * k}" y="${y + 4 * k}" font-size="${sz * k}" font-family="Barlow,sans-serif" font-weight="700" fill="${col}" stroke="${C.sea}" stroke-width="${3 * k}" paint-order="stroke" pointer-events="none">${esc(t)}</text>`;
  let h = '';
  for (const c of CITIES) {
    const [x, y] = P(c), sel = S && S.dest === c.id;
    h += `<g data-id="${c.id}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${10 * k}" fill="transparent"/><circle cx="${x}" cy="${y}" r="${(sel ? 4.5 : 2.6) * k}" fill="${sel ? C.ink : C.dot}" opacity="${sel ? 1 : 0.6}"/></g>`;
    if (sel) h += lbl(x, y, c.n, C.ink);
  }
  if (S) {
    for (const id of S.safe) { const [x, y] = P(CITY[id]); h += `<rect x="${x - 3.5 * k}" y="${y - 3.5 * k}" width="${7 * k}" height="${7 * k}" fill="${C.safe}" pointer-events="none"/>`; }
    for (const id of S.fenceKnown) { const [x, y] = P(CITY[id]); h += lbl(x, y, 'Reducidor', C.me, 10); }
    if (S.buyer) { const [x, y] = P(CITY[S.buyer]); h += `<circle cx="${x}" cy="${y}" r="${5 * k}" fill="none" stroke="${C.me}" stroke-width="${2 * k}" pointer-events="none"/>` + lbl(x, y, 'Comprador · ' + CITY[S.buyer].n, C.me, 10.5); }
    for (let i = 1; i < S.path.length; i++) h += `<path d="${arc(CITY[S.path[i - 1]], CITY[S.path[i]])}" fill="none" stroke="${C.me}" stroke-width="${2 * k}" stroke-dasharray="${5 * k} ${4 * k}" opacity=".8" pointer-events="none"/>`;
    const seen = new Set();
    for (const t of S.traces) {
      if (!t.shown || seen.has(t.city)) continue;
      seen.add(t.city);
      const [x, y] = P(CITY[t.city]), s = 4.5 * k;
      h += `<path d="M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}" stroke="${C.trace}" stroke-width="${2.4 * k}" pointer-events="none"/>`;
    }
    const po = S.police;
    if (po.city && (S.hours < S.soplonUntil || S.over)) {
      const [x, y] = P(CITY[po.city]);
      h += `<circle cx="${x}" cy="${y}" r="${6 * k}" fill="${C.police}" stroke="${C.sea}" stroke-width="${1.5 * k}" pointer-events="none"/>` + lbl(x, y - 12 * k, 'PDI', C.police, 10.5);
      if (po.arrive != null && po.target) h += `<path d="${arc(CITY[po.city], CITY[po.target])}" fill="none" stroke="${C.police}" stroke-width="${1.6 * k}" stroke-dasharray="${3 * k} ${3 * k}" pointer-events="none"/>`;
    }
    // Pato Malo: la cara cambia con su estado de ánimo
    const [x, y] = P(me()), r = 13 * k;
    h += `<circle class="pulse" cx="${x}" cy="${y}" r="${7 * k}" fill="${C.me}" pointer-events="none"/>`
      + `<circle cx="${x}" cy="${y}" r="${r + 2 * k}" fill="#201b26" stroke="${C.me}" stroke-width="${2 * k}" pointer-events="none"/>`
      + `<image href="${face(moodOf())}" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" clip-path="url(#meclip)" preserveAspectRatio="xMidYMin slice" pointer-events="none"/>`
      + lbl(x + 10 * k, y - 12 * k, me().n, C.me, 13);
  }
  o.innerHTML = h;
}

export function setVB(v) {
  VB = v;
  svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  drawOverlay();
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
  const f = { ...VB }, t0 = performance.now(), D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
  const st = (n) => {
    const p = D ? Math.min(1, (n - t0) / D) : 1, e = 1 - Math.pow(1 - p, 3);
    setVB({ x: f.x + (t.x - f.x) * e, y: f.y + (t.y - f.y) * e, w: f.w + (t.w - f.w) * e, h: f.h + (t.h - f.h) * e });
    if (p < 1) anim = requestAnimationFrame(st);
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

export function zoomStart() { setVB(fit([P({ la: 15, lo: -120 }), P({ la: -56, lo: -30 })], 300)); }
