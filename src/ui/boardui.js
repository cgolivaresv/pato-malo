// Pantalla del golpe táctico: plano del barrio en SVG, toques para moverse y acciones según dónde estés.
import { CITY } from '../data/geo.js';
import { esc, money, store } from '../lib/util.js';
import { CAPACITY, HEAVY, FOOT_EXITS } from '../data/heistdata.js';
import * as B from '../game/board.js';
import { face } from './pato.js';
import { detFace } from './detective.js';
import { I } from './icons.js';
import { sfx, music, musicLevel } from '../audio/sound.js';

const U = 10; // unidades SVG por casilla
let st = null; // { P, H, onEnd, walk }

const ICON = { fajo: '💵', bolsa: '💰', sobre: '✉️', bandeja: '💍', lingote: '🟨', oleo: '🖼️', caja: '🗃️', reloj: '⌚' };
const EXIT_ICON = { paradero: '🚏', metro: 'Ⓜ️', ascensor: '🚡', muelle: '⚓' };

export function openBoard(P, H, onEnd) {
  let el = document.getElementById('heist');
  if (!el) { el = document.createElement('div'); el.id = 'heist'; el.className = 'heist-ui'; document.body.appendChild(el); }
  el.hidden = false;
  st = { P, H, onEnd, walk: null, alarmWas: false, recWas: false, logN: 0, help: !store('pato-plano-visto') };
  store('pato-plano-visto', true);
  music(true); musicLevel(1);
  draw();
}

export function boardTap(arg) {
  if (!st) return;
  const H = st.H;
  if (st.walk) { clearInterval(st.walk); st.walk = null; return; }
  const [x, y] = arg.split(',').map(Number);
  if (H.phase === 'place') {
    const i = H.spots.findIndex((s) => s.x === x && s.y === y);
    if (i < 0) return;
    const kind = H.vehicles.length === 0 ? H.cfg.vehicle : 'moto';
    if (B.placeVehicle(H, i, kind)) sfx('tap');
    if (H.vehicles.length >= (H.cfg.planB ? 2 : 1)) H.phase = 'entry';
    draw();
    return;
  }
  if (H.phase === 'entry') {
    const i = H.start.findIndex((s) => s.x === x && s.y === y);
    if (i < 0) return;
    B.chooseStart(H, i);
    sfx('paper');
    after();
    return;
  }
  if (H.phase !== 'play' || H.over) return;
  const p = H.player;
  if (Math.abs(p.x - x) + Math.abs(p.y - y) === 1) { if (B.step(H, x, y)) after(); return; }
  const path = B.pathTo(H, x, y);
  if (!path || path.length < 2) return;
  // Caminar varios pasos: se detiene si pasa algo
  let i = 1;
  const logStart = H.log.length;
  st.walk = setInterval(() => {
    const n = path[i++];
    const ok = n && B.step(H, n.x, n.y);
    const alarmed = H.log.slice(logStart).some((l) => l.cls === 'warn' || l.cls === 'bad');
    if (!ok || i >= path.length || H.over || alarmed) { clearInterval(st.walk); st.walk = null; }
    after();
  }, 150);
}

export function boardAct(arg) {
  if (!st || st.walk) return;
  const [id, a] = arg.split('|');
  const SND = { force: 'stamp', esmeril: 'stamp', window: 'stamp', ganzua: 'tap', byte: 'radio', take: 'cash', drop: 'close', cams: 'swish', luz: 'swish', inhib: 'swish', autoAlarm: 'alert', tunnel: 'paso', tunnelIn: 'paso', wait: 'tap' };
  if (SND[id]) sfx(SND[id]);
  if (id === 'leave') sfx(a === 'veh' ? (st.H.vehicles.find((v) => v.x === st.H.player.x && v.y === st.H.player.y) || {}).k === 'auto' ? 'bus' : 'air' : 'paso');
  B.act(st.H, id, a || undefined);
  after();
}

// Solo para pruebas: termina el golpe al tiro con el botín más cercano
export function devFinish(caught) {
  if (!st) return;
  const H = st.H;
  if (H.phase !== 'play') { while (H.phase === 'place') B.placeVehicle(H, H.vehicles.length, H.cfg.vehicle || 'moto') || (H.phase = 'entry'); if (H.vehicles.length >= (H.cfg.planB ? 2 : 1)) H.phase = 'entry'; B.chooseStart(H, 0); }
  const it = H.items.find((i) => i.art) || H.items.find((i) => i.goods) || H.items[0];
  H.items = H.items.filter((i) => i !== it); H.carried.push(it);
  H.over = caught ? { caught: true, msg: 'Prueba.' } : { caught: false, exit: H.cfg.vehicle || 'paradero' };
  after();
}

// Volver a la preparación antes de entrar
export function boardBack() {
  if (!st || st.H.phase === 'play') return;
  close();
  import('./heistui.js').then((m) => m.reopenPrep());
}

function after() {
  const H = st.H;
  if (H.alarm && !st.alarmWas) { st.alarmWas = true; sfx('siren'); musicLevel(2); }
  if (H.recorded && !st.recWas) { st.recWas = true; sfx('alert'); }
  draw();
  if (H.over) {
    const H2 = H, fn = st.onEnd;
    setTimeout(() => { close(); fn(H2); }, H.over.caught ? 900 : 500);
  }
}

function close() {
  if (st && st.walk) clearInterval(st.walk);
  const el = document.getElementById('heist');
  if (el) { el.hidden = true; el.innerHTML = ''; }
  st = null;
}

// ---------- Dibujo ----------
function draw() {
  const { H, P } = st;
  const el = document.getElementById('heist');
  const p = H.player;
  const room = p ? B.roomAt(H, p.x, p.y) : null;
  const title = H.phase === 'place' ? (H.vehicles.length ? 'Deja la moto del plan B' : `Deja ${H.cfg.vehicle === 'auto' ? 'el auto' : 'la moto'}`)
    : H.phase === 'entry' ? '¿Por dónde entras?' : room ? B.ROOM_N[room.kind] : 'En la calle';
  const hint = H.phase === 'place' ? 'Toca una de las esquinas marcadas.' : H.phase === 'entry' ? 'Toca uno de los puntos marcados para empezar.' : '';
  const w = B.weight(H), loot = H.carried.reduce((a, i) => a + (i.value || 0), 0);
  const camsTxt = H.camsOff === Infinity ? 'Apagadas' : H.camsOff > 0 ? `Apagadas ${H.camsOff}` : H.inhib > 0 ? `Inhibidor ${H.inhib}` : 'Activas';
  const alarmTxt = !H.alarm ? 'Tranquilo' : H.patrols.length ? '¡Patrullas!' : `Carabineros en ${H.patrolIn}`;
  const acts = B.actions(H);
  const logs = H.log.slice(-3).reverse();
  el.innerHTML = `
  <header class="hz-top">
    <div class="hz-title"><div class="file-no">${esc(CITY[P.city].n)} · ${esc(P.cr.n)}</div><b>${esc(title)}</b>${hint ? `<small>${hint}</small>` : ''}</div>
    ${H.phase !== 'play' ? '<button type="button" class="btn ghost" data-act="hzBack">Volver</button>' : ''}
  </header>
  <div class="hz-hud">
    <span class="hz-s">${I.clock}<b>${H.turn}</b><small>turnos</small></span>
    <span class="hz-s noise ${H.noise >= 7 ? 'hot' : H.noise >= 4 ? 'warm' : ''}"><small>Ruido</small><i class="nb">${Array.from({ length: 10 }, (_, i) => `<i class="${i < H.noise ? 'on' : ''}"></i>`).join('')}</i></span>
    <span class="hz-s ${w > HEAVY ? 'warm' : ''}">🎒<b>${w}/${CAPACITY}</b><small>${w > HEAVY ? 'lento' : 'kg'}</small></span>
    <span class="hz-s good">${I.cash}<b>${shortM(loot)}</b><small>botín</small></span>
    <span class="hz-s ${H.camsOff || H.inhib ? 'good' : ''}">📷<b>${camsTxt}</b></span>
    <span class="hz-s ${H.alarm ? 'hot' : ''}">🚨<b>${alarmTxt}</b></span>
  </div>
  <div class="hz-board">${svg(H)}</div>
  <div class="hz-panel">
    <ul class="hz-log">${logs.map((l) => `<li class="${l.cls}">${esc(l.t)}</li>`).join('') || '<li>Toca una casilla para moverte. Cada paso es un turno: los guardias también se mueven.</li>'}</ul>
    ${H.phase === 'play' ? `<div class="hz-acts">${acts.map((a) => `<button type="button" class="hz-a${a.primary ? ' primary' : ''}${a.id === 'abort' ? ' ghost' : ''}" data-act="hzAct" data-arg="${a.id}|${a.arg || ''}"${a.disabled ? ' disabled' : ''}><b>${esc(a.n)}</b><small>${esc(a.disabled && a.why ? a.why : a.d)}</small></button>`).join('')}</div>` : ''}
    <details class="hz-help"${st.help ? ' open' : ''}><summary>Cómo se juega</summary><p>Toca una casilla para caminar; cada paso es un turno. Los guardias 💂 ven en el cono amarillo: si te ven, sospechan (¿?) y, si te siguen viendo, suena la alarma. Las cámaras 📷 graban en el cono rojo. Forzar puertas mete ruido; con el ruido al máximo suena la alarma. Toma el botín, ojo con el peso (más de ${HEAVY} kg te pone lento), y sal por tu vehículo o una salida a pie. Con alarma, Carabineros sale del retén 🚨 y te busca por la calle.</p></details>
  </div>`;
  st.logN = H.log.length;
}

const shortM = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace('.', ',')} M` : n >= 1e3 ? `$${Math.round(n / 1e3)} mil` : '$0');

function svg(H) {
  const W = H.cols * U, Ht = H.rows * U;
  const out = [];
  const t = (x, y, s, size = 7, cls = '') => `<text class="hz-ic ${cls}" x="${x * U + U / 2}" y="${y * U + U / 2 + size * 0.35}" font-size="${size}" text-anchor="middle">${s}</text>`;
  // Celdas
  for (let y = 0; y < H.rows; y++) for (let x = 0; x < H.cols; x++) {
    const c = H.cells[y][x];
    const kn = B.known(H, x, y);
    let cls = c.t;
    if (c.t === 'floor') { const r = H.rooms[c.room]; cls += ` r-${r.kind}${kn ? '' : ' fog'}`; }
    if (c.t === 'door') cls += (c.armored ? ' armored' : '') + (c.open ? ' open' : c.locked ? ' locked' : ' unlocked');
    if (c.t === 'window') cls += c.broken ? ' broken' : '';
    out.push(`<rect class="hz-c ${cls}" x="${x * U}" y="${y * U}" width="${U}" height="${U}" data-act="hzCell" data-arg="${x},${y}"/>`);
  }
  // Nombres de las piezas conocidas
  for (const r of H.rooms) if (r.seen) out.push(`<text class="hz-room" x="${r.x0 * U + 1}" y="${r.y0 * U + 3.2}" font-size="2.6">${esc(B.ROOM_N[r.kind])}</text>`);
  // Cono de cámaras y guardias visibles
  const camsOn = B.camsActive(H);
  for (const c of H.cams) {
    if (!B.known(H, c.x, c.y)) continue;
    if (camsOn) for (const q of B.cone(H, c, c.dir, 3)) out.push(`<rect class="hz-cone cam" x="${q.x * U}" y="${q.y * U}" width="${U}" height="${U}"/>`);
  }
  const showG = (g) => H.routes || B.known(H, g.x, g.y);
  for (const g of H.guards) {
    if (!showG(g) || g.bribed) continue;
    for (const q of B.cone(H, g, g.dir, B.sightR(H))) out.push(`<rect class="hz-cone guard${g.mode === 'chase' ? ' chase' : ''}" x="${q.x * U}" y="${q.y * U}" width="${U}" height="${U}"/>`);
  }
  // Rondas conocidas
  if (H.routes) for (const g of H.guards) if (g.path.length > 1) out.push(`<polyline class="hz-route" points="${g.path.map((q) => `${q.x * U + U / 2},${q.y * U + U / 2}`).join(' ')} ${g.path[0].x * U + U / 2},${g.path[0].y * U + U / 2}"/>`);
  // Puntos especiales
  out.push(t(H.reten.x, H.reten.y, '🚨', 6.5));
  for (const e of H.exits) out.push(t(e.x, e.y, EXIT_ICON[e.k] || '🚏', 6.5, e.closed ? 'off' : ''));
  out.push(t(H.box.x, H.box.y, '⚡', 6));
  if (B.known(H, H.panel.x, H.panel.y)) out.push(t(H.panel.x, H.panel.y, '🔌', 6));
  if (H.tunnel && B.known(H, H.tunnel.x, H.tunnel.y)) out.push(t(H.tunnel.x, H.tunnel.y, '🕳️', 6.5));
  if (H.grate) out.push(t(H.grate.x, H.grate.y, '🕳️', 6.5));
  for (const v of H.vehicles) out.push(t(v.x, v.y, v.k === 'auto' ? '🚗' : '🏍️', 7) + (v.b ? `<text class="hz-b" x="${v.x * U + 8.6}" y="${v.y * U + 3}" font-size="3">B</text>` : ''));
  for (const it of H.items) if (B.known(H, it.x, it.y)) out.push(t(it.x, it.y, ICON[it.k] || '💵', 6.5));
  for (const c of H.cams) if (B.known(H, c.x, c.y)) out.push(t(c.x, c.y, '📷', 5, camsOn && !c.rec ? '' : 'off'));
  // Marcas de las fases de inicio
  if (H.phase === 'place') for (const s of H.spots) if (!H.vehicles.some((v) => v.x === s.x && v.y === s.y)) out.push(`<rect class="hz-pick" x="${s.x * U + 0.6}" y="${s.y * U + 0.6}" width="${U - 1.2}" height="${U - 1.2}" data-act="hzCell" data-arg="${s.x},${s.y}"/>`);
  if (H.phase === 'entry') H.start.forEach((s) => out.push(`<rect class="hz-pick" x="${s.x * U + 0.6}" y="${s.y * U + 0.6}" width="${U - 1.2}" height="${U - 1.2}" data-act="hzCell" data-arg="${s.x},${s.y}"/><text class="hz-lbl" x="${s.x * U + U / 2}" y="${s.y * U + (s.y === 0 ? U + 3.4 : -1.2)}" font-size="2.8" text-anchor="middle">${esc(s.n)}</text>`));
  // Personas
  for (const g of H.guards) {
    if (!showG(g)) continue;
    out.push(t(g.x, g.y, '💂', 7, g.bribed ? 'bribed' : ''));
    if (H.alarm && !g.bribed) out.push(`<text class="hz-alert" x="${g.x * U + 8}" y="${g.y * U + 2.6}" font-size="4">!</text>`);
    else if (g.sus > 0) out.push(`<text class="hz-sus s${Math.min(3, Math.ceil(g.sus))}" x="${g.x * U + 8}" y="${g.y * U + 2.6}" font-size="4">?</text>`);
  }
  for (const k of H.patrols) out.push(t(k.x, k.y, '🚓', 7));
  if (H.mcc) out.push(`<image href="${detFace('serio')}" x="${H.mcc.x * U + 0.5}" y="${H.mcc.y * U + 0.5}" width="${U - 1}" height="${U - 1}" class="hz-mcc"/>`);
  if (H.player) {
    const p = H.player;
    out.push(`<circle class="hz-me" cx="${p.x * U + U / 2}" cy="${p.y * U + U / 2}" r="${U / 2 - 0.4}"/><image href="${face(H.alarm ? 'sorprendido' : H.disguise ? 'guino' : 'normal')}" x="${p.x * U + 0.8}" y="${p.y * U + 0.8}" width="${U - 1.6}" height="${U - 1.6}" clip-path="circle(50%)"/>`);
    // Casillas vecinas donde se puede caminar
    if (H.phase === 'play' && !H.over) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (B.playerWalkable(H, p.x + dx, p.y + dy)) out.push(`<rect class="hz-near" x="${(p.x + dx) * U + 1.5}" y="${(p.y + dy) * U + 1.5}" width="${U - 3}" height="${U - 3}" data-act="hzCell" data-arg="${p.x + dx},${p.y + dy}"/>`);
  }
  return `<svg id="hzMap" viewBox="0 0 ${W} ${Ht}" preserveAspectRatio="xMidYMid meet" role="application" aria-label="Plano del golpe">${out.join('')}</svg>`;
}
