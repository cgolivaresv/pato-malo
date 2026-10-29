// Mapa simulado de la ciudad para preparar el golpe: Pato camina entre lugares y cada acción gasta horas.
import { CITY } from '../data/geo.js';
import { esc, money } from '../lib/util.js';
import { DAY_EVENTS, ROLE_N } from '../data/heistdata.js';
import * as M from '../game/prepmap.js';
import { suspicion, prepCost, crewCut, member, contractText } from '../game/heist.js';
import { face } from './pato.js';
import { detFace } from './detective.js';
import { I } from './icons.js';
import { sfx } from '../audio/sound.js';

const U = 46, MG = 26; // separación entre esquinas y margen
let P = null, sel = null, busy = false, onGolpe = null, onQuit = null;

export function openPrepMap(prep, golpe, quit) {
  P = prep; onGolpe = golpe; onQuit = quit;
  if (!P.places) M.setupMap(P);
  sel = sel && P.pos[sel] ? sel : 'objetivo';
  let el = document.getElementById('prepmap');
  if (!el) { el = document.createElement('div'); el.id = 'prepmap'; el.className = 'heist-ui pm'; document.body.appendChild(el); }
  el.hidden = false;
  draw();
}
export function closePrepMap() { const el = document.getElementById('prepmap'); if (el) { el.hidden = true; el.innerHTML = ''; } }

export function pmSelect(id) { if (busy || !P) return; sel = id; sfx('tap'); draw(); }
export function pmQuit() { if (busy) return; closePrepMap(); onQuit && onQuit(); }

// Hace una acción: si no estás ahí, Pato camina primero (animado) y después gasta el tiempo de la acción
export function pmDo(arg) {
  if (busy || !P) return;
  const [pid, i] = arg.split('|');
  const a = M.placeActions(P, pid)[Number(i)];
  if (!a || a.off) return;
  busy = true;
  const finish = () => {
    if (a.id === 'golpe') { busy = false; startGolpe(); return; }
    working(a, () => {
      M.doAction(P, a, suspicion(P));
      sfx(a.id === 'contratar' || a.id === 'tool' || a.id === 'moto' || a.id === 'planB' ? 'cash' : a.id === 'dormir' ? 'rest' : a.id === 'cavar' ? 'paso' : 'paper');
      busy = false;
      if (M.timeLeft(P) <= 0) { M.log(P, '¡Llegó la noche del golpe! Vas directo al lugar.', 'warn'); draw(); setTimeout(() => walkThen('objetivo', startGolpe), 700); return; }
      draw();
    });
  };
  if (P.at !== pid) walkThen(pid, finish); else finish();
}

function startGolpe() {
  if (P.at !== 'objetivo') M.walkTo(P, 'objetivo');
  P.golpeAt = P.clock;
  closePrepMap();
  onGolpe && onGolpe(P);
}

// Animación de la caminata cuadra por cuadra
function walkThen(pid, done) {
  const pts = M.route(P, pid);
  const g = document.getElementById('pmPato');
  if (!g || pts.length < 2) { M.walkTo(P, pid); done(); return; }
  sfx('paso');
  let i = 1;
  const stepMs = 130;
  const t0 = P.clock, total = (pts.length - 1) * M.BLOCK_H;
  const tick = () => {
    const p = pts[i];
    g.setAttribute('transform', `translate(${nx(p.x)},${ny(p.y)})`);
    const clk = document.getElementById('pmClock');
    if (clk) clk.textContent = M.clockTxt(t0 + (total * i) / (pts.length - 1));
    i++;
    if (i < pts.length) setTimeout(tick, stepMs);
    else setTimeout(() => { M.walkTo(P, pid); draw(); done(); }, stepMs);
  };
  setTimeout(tick, 30);
}

// Burbuja "trabajando" mientras corre el reloj de la acción
function working(a, done) {
  if (!a.h) { done(); return; }
  const b = document.getElementById('pmBusy'), clk = document.getElementById('pmClock');
  if (b) { b.hidden = false; b.innerHTML = `<b>${esc(a.n)}</b><small>${a.h >= 1 ? Math.round(a.h * 10) / 10 + ' h' : Math.round(a.h * 60) + ' min'}</small><i class="pm-bar"><i></i></i>`; }
  const t0 = P.clock, ms = Math.min(1100, 350 + a.h * 70);
  const start = performance.now();
  const run = (now) => {
    const k = Math.min(1, (now - start) / ms);
    if (clk) clk.textContent = M.clockTxt(t0 + a.h * k);
    if (k < 1) requestAnimationFrame(run); else { if (b) b.hidden = true; done(); }
  };
  requestAnimationFrame(run);
}

const nx = (x) => MG + (P.look.sea ? 34 : 0) + x * U;
const ny = (y) => MG + y * U;

function draw() {
  const el = document.getElementById('prepmap');
  if (!el || !P) return;
  const city = CITY[P.city], ev = DAY_EVENTS.find((e) => e.id === P.event);
  const sus = suspicion(P), left = M.timeLeft(P);
  const crew = Object.entries(P.crew).filter(([, id]) => id).map(([r, id]) => `${ROLE_N[r]}: ${member(id).n}`);
  const have = [
    ...crew,
    ...[...P.prep].map((k) => ({ planos: 'Planos', conserje: 'Conserje sobornado', guardia: 'Guardia sobornado', infiltracion: 'Uniforme de aseador', tunel: 'Túnel listo', llamada: 'Llamada falsa' }[k])),
    ...Object.entries(P.tools).filter(([, n]) => n).map(([k, n]) => `${{ ganzua: 'Ganzúa', esmeril: 'Esmeril', inhibidor: 'Inhibidor' }[k]} ×${n}`),
    P.vehicle ? (P.vehicle === 'auto' ? 'Auto del chofer' : 'Moto') : '', P.planB ? 'Plan B' : '',
    P.recon ? `Plano conocido ${P.recon}/4` : '', P.contractOn ? `Encargo: ${P.contract.n}` : '',
  ].filter(Boolean);
  const place = M.placeOf(P, sel);
  const acts = M.placeActions(P, sel);
  const here = P.at === sel;
  const wh = here ? 0 : M.walkH(P, sel);
  const logs = P.mapLog.slice(-2).reverse();
  el.innerHTML = `
  <header class="hz-top">
    <div class="hz-title"><div class="file-no">${esc(city.n)} · ${esc(P.cr.n)}</div><b>Preparación</b></div>
    <button type="button" class="btn ghost" data-act="pmQuit">Otro golpe</button>
  </header>
  <div class="hz-hud">
    <span class="hz-s">${I.clock}<b id="pmClock">${M.clockTxt(P.clock)}</b></span>
    <span class="hz-s ${left < 8 ? 'hot' : left < 20 ? 'warm' : ''}">⏳<b>${left > 0 ? `${Math.ceil(left)} h` : '¡Ya!'}</b><small>para el golpe</small></span>
    <span class="hz-s ${sus >= 60 ? 'hot' : sus >= 40 ? 'warm' : ''}">🕵️<b>${sus}%</b><small>sospecha</small></span>
    <span class="hz-s ${P.awake >= 16 ? 'warm' : ''}">😴<b>${Math.round(P.awake)}/20</b><small>h despierto</small></span>
    <span class="hz-s">${I.cash}<b>${money(prepCost(P) + (P.sunk || 0))}</b><small>gastos</small></span>
    ${crewCut(P) ? `<span class="hz-s">${I.coins}<b>${Math.round(crewCut(P) * 100)}%</b><small>equipo</small></span>` : ''}
  </div>
  <div class="hz-board pm-board">${svg()}<div class="pm-busy" id="pmBusy" hidden></div></div>
  <div class="hz-panel">
    <ul class="hz-log">${logs.map((l) => `<li class="${l.cls}">${esc(l.t)}</li>`).join('')}</ul>
    <div class="pm-place"><span class="pm-ic">${place.icon}</span><div><b>${esc(place.n)}</b><small>${esc(place.d)}${place.open ? ` Abre de ${String(place.open[0]).padStart(2, '0')}:00 a ${String(place.open[1] % 24).padStart(2, '0')}:00.` : ''}</small><small class="pm-dist">${here ? 'Estás aquí.' : `A ${Math.round(wh / M.BLOCK_H)} cuadras (${Math.round(wh * 60)} min caminando).`}</small></div></div>
    <div class="hz-acts">${acts.map((a, i) => `<button type="button" class="hz-a${a.primary ? ' primary' : ''}" data-act="pmDo" data-arg="${sel}|${i}"${a.off ? ' disabled' : ''}><b>${here || a.id === 'golpe' ? '' : 'Ir y '}${esc(here || a.id === 'golpe' ? a.n : a.n.charAt(0).toLowerCase() + a.n.slice(1))}</b><small>${esc(a.off || a.d)}</small><span class="pm-chips">${a.h ? `<i>${a.h >= 1 ? Math.round(a.h * 10) / 10 + ' h' : Math.round(a.h * 60) + ' min'}</i>` : ''}${a.cost ? `<i>${money(a.cost)}</i>` : ''}${a.sus ? `<i class="sus">+${a.sus} sospecha</i>` : ''}</span></button>`).join('')}</div>
    <div class="pm-info"><span><b>Imprevisto:</b> ${esc(ev.n)}. ${esc(ev.d)}</span>${P.contract ? `<span><b>Encargo ${P.contractOn ? 'aceptado' : 'disponible'}:</b> ${esc(P.contract.n)}. ${esc(contractText(P))}</span>` : ''}${have.length ? `<span><b>Tienes:</b> ${have.map(esc).join(' · ')}</span>` : '<span>Todavía no tienes nada preparado. Toca un lugar del mapa.</span>'}</div>
  </div>`;
}

function svg() {
  const L = P.look, sx = L.sea ? 34 : 0;
  const W = MG * 2 + sx + (M.GW - 1) * U, H = MG * 2 + (M.GH - 1) * U;
  const h = M.hourOf(P.clock), isNight = h >= 20 || h < 7, dusk = (h >= 18 && h < 20) || (h >= 6 && h < 8);
  const o = [];
  o.push(`<rect class="pm-land" x="0" y="0" width="${W}" height="${H}"/>`);
  if (L.sea) o.push(`<rect class="pm-sea" x="0" y="0" width="${sx + 10}" height="${H}"/>`, ...Array.from({ length: 7 }, (_, i) => `<text class="pm-wave" x="${8 + (i % 2) * 10}" y="${30 + i * 60}" font-size="11">〰</text>`));
  // Manzanas
  let k = 0;
  for (let y = 0; y < M.GH - 1; y++) for (let x = 0; x < M.GW - 1; x++) {
    k++;
    const cx = nx(x) + 7, cy = ny(y) + 7, w = U - 14;
    const center = x === Math.floor((M.GW - 1) / 2) && y === Math.floor((M.GH - 1) / 2);
    const park = !center && (k * 37) % 11 === 0;
    const hill = L.hills && x >= M.GW - 3;
    o.push(`<rect class="pm-block${center ? ' plaza' : park ? ' park' : hill ? ' hill' : ''}" x="${cx}" y="${cy}" width="${w}" height="${w}" rx="3"/>`);
    if (center) o.push(`<text class="pm-tree" x="${cx + w / 2}" y="${cy + w / 2 + 5}" font-size="13" text-anchor="middle">⛲</text>`);
    else if (park) o.push(`<text class="pm-tree" x="${cx + w / 2}" y="${cy + w / 2 + 5}" font-size="12" text-anchor="middle">🌳</text>`);
    else if (isNight) for (let j = 0; j < 3; j++) if ((k * 7 + j * 13) % 5 < 2) o.push(`<rect class="pm-win" x="${cx + 6 + j * 9}" y="${cy + 8 + ((k + j) % 3) * 8}" width="3" height="4"/>`);
  }
  // Río
  if (L.river) { const ry = ny(1) + U / 2; o.push(`<rect class="pm-river" x="0" y="${ry - 8}" width="${W}" height="16"/>`); }
  // Calles
  for (let y = 0; y < M.GH; y++) o.push(`<line class="pm-street" x1="${nx(0) - 14}" y1="${ny(y)}" x2="${nx(M.GW - 1) + 14}" y2="${ny(y)}"/>`);
  for (let x = 0; x < M.GW; x++) o.push(`<line class="pm-street" x1="${nx(x)}" y1="${ny(0) - 14}" x2="${nx(x)}" y2="${ny(M.GH - 1) + 14}"/>`);
  // Ruta al lugar elegido
  if (sel && sel !== P.at) { const pts = M.route(P, sel); o.push(`<polyline class="pm-route" points="${pts.map((p) => `${nx(p.x)},${ny(p.y)}`).join(' ')}"/>`); }
  // Lugares
  for (const p of P.places) {
    const q = P.pos[p.id], open = M.isOpen(p, P.clock), on = sel === p.id;
    o.push(`<g class="pm-pl${on ? ' on' : ''}${open ? '' : ' closed'}${p.id === 'objetivo' ? ' tgt' : ''}" data-act="pmSel" data-arg="${p.id}">
      <circle cx="${nx(q.x)}" cy="${ny(q.y)}" r="${p.id === 'objetivo' ? 16 : 13}"/>
      <text x="${nx(q.x)}" y="${ny(q.y) + 5}" font-size="${p.id === 'objetivo' ? 16 : 13}" text-anchor="middle">${p.icon}</text>
      ${open ? '' : `<text class="pm-lock" x="${nx(q.x) + 10}" y="${ny(q.y) - 8}" font-size="8">🔒</text>`}
      <text class="pm-lbl" x="${nx(q.x)}" y="${ny(q.y) + (p.id === 'objetivo' ? 27 : 24)}" font-size="7.5" text-anchor="middle">${esc(p.n)}</text>
    </g>`);
  }
  // McCuack de civil
  if (P.mcc) { const q = P.pos[P.mcc]; o.push(`<image href="${detFace('pensativo')}" x="${nx(q.x) + 6}" y="${ny(q.y) - 26}" width="20" height="20" class="pm-mcc"/>`); }
  // Pato
  const me = P.pos[P.at];
  o.push(`<g id="pmPato" class="pm-me" transform="translate(${nx(me.x)},${ny(me.y)})"><circle r="12" cx="-14" cy="-14"/><image href="${face(P.awake >= 16 ? 'triste' : 'normal')}" x="-25" y="-25" width="22" height="22" clip-path="circle(50%)"/></g>`);
  // Luz del día y lluvia
  if (isNight || dusk) o.push(`<rect class="pm-night${dusk ? ' dusk' : ''}" x="0" y="0" width="${W}" height="${H}"/>`);
  if (P.event === 'lluvia') o.push(`<rect class="pm-rain" x="0" y="0" width="${W}" height="${H}"/>`);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="application" aria-label="Mapa de ${esc(CITY[P.city].n)}"><defs><pattern id="pmRainP" width="8" height="14" patternUnits="userSpaceOnUse"><line x1="6" y1="0" x2="2" y2="10" stroke="#9cc8ff55" stroke-width="1"/></pattern></defs>${o.join('')}</svg>`;
}
