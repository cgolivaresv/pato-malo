// Golpe táctico por turnos sobre el plano de un barrio. Solo lógica: no toca la interfaz.
// Coordenadas: x = columna, y = fila. Cada acción gasta turnos; en cada turno se mueven
// los guardias, las patrullas y McCuack, y se revisa quién te ve.
import { LOOT, CAPACITY, HEAVY, FOOT_EXITS, CITY_FLAVOR } from '../data/heistdata.js';
import { R, pick, shuffle } from '../lib/util.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (x, y) => `${x},${y}`;
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const rint = (a, b) => a + Math.floor(R() * (b - a + 1));

export const ROOM_N = { front: 'Local', hall: 'Hall', office: 'Oficina', vault: 'Bóveda', back: 'Bodega', security: 'Sala de seguridad' };

// ---------- Generación ----------
// cfg: { cr, city, tier, event, prep:Set, crew:{chofer,hacker,campana}, tools, contract, memory, vehicle, planB, mcc }
export function generate(cfg) {
  const { cr, tier } = cfg;
  const cols = 11, rows = tier >= 4 ? 15 : 13;
  const H = {
    cfg, cols, rows, cells: [], rooms: [], items: [], cams: [], guards: [], patrols: [], log: [],
    turn: 0, noise: 0, alarm: false, patrolIn: null, camsOff: 0, inhib: 0, phase: 'place',
    carried: [], recorded: false, seenGuard: false, mccSaw: false, forced: 0, over: null,
    disguise: cfg.prep.has('infiltracion'), routes: cfg.prep.has('conserje') || !!(cfg.crew.campana && cfg.crew.campana.routes),
    tools: { ...cfg.tools }, usedAuto: false, quakeAt: cfg.event === 'temblor' ? rint(5, 12) : -1,
    vehicles: [], player: null, mcc: null, start: [],
  };
  for (let y = 0; y < rows; y++) {
    H.cells.push([]);
    for (let x = 0; x < cols; x++) {
      const street = y <= 1 || y >= rows - 2 || x === 0 || x === cols - 1;
      H.cells[y].push({ t: street ? 'street' : 'wall', room: -1 });
    }
  }
  // Edificio: muros en x=1 y x=cols-2, y=2 e y=rows-3; interior adentro
  const bx0 = 1, bx1 = cols - 2, by0 = 2, by1 = rows - 3;
  const ix0 = bx0 + 1, ix1 = bx1 - 1, iy0 = by0 + 1, iy1 = by1 - 1;
  const hm = Math.floor((iy0 + iy1) / 2); // muro horizontal: atrás (arriba) / adelante (abajo)
  const xm = Math.floor((ix0 + ix1) / 2) + (R() < 0.5 ? 0 : 1) - 0; // muro vertical
  const addRoom = (kind, x0, y0, x1, y1) => {
    const id = H.rooms.length;
    H.rooms.push({ id, kind, x0, y0, x1, y1, seen: cfg.prep.has('planos') });
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) H.cells[y][x] = { t: 'floor', room: id };
    return id;
  };
  let front, office = -1, vault, security = -1;
  if (tier <= 1) {
    vault = addRoom('back', ix0, iy0, ix1, hm - 1);
    front = addRoom('front', ix0, hm + 1, ix1, iy1);
  } else {
    office = addRoom('office', ix0, iy0, xm - 1, hm - 1);
    vault = addRoom('vault', xm + 1, iy0, ix1, hm - 1);
    if (tier >= 4) {
      security = addRoom('security', ix0, hm + 1, xm - 1, iy1);
      front = addRoom('hall', xm + 1, hm + 1, ix1, iy1);
    } else front = addRoom('front', ix0, hm + 1, ix1, iy1);
  }
  H.ids = { front, office, vault, security };
  const room = (id) => H.rooms[id];
  const door = (x, y, opts) => { H.cells[y][x] = { t: 'door', room: -1, locked: true, ...opts }; return { x, y }; };
  // Puertas interiores
  if (tier <= 1) {
    door(rint(ix0, ix1), hm, { name: 'Puerta de la bodega', locked: R() < 0.7 });
  } else {
    const off = room(office), vr = room(vault), fr = room(front);
    // Oficina ↔ adelante (por la parte de la oficina que toca el frente)
    door(rint(off.x0, off.x1), hm, { name: 'Puerta de la oficina', locked: R() < 0.5 });
    // Bóveda: puerta blindada hacia la oficina
    door(xm, rint(vr.y0, vr.y1), { name: 'Puerta blindada', armored: true });
    if (tier >= 4) {
      const sr = room(security);
      door(xm, rint(sr.y0, sr.y1), { name: 'Puerta de seguridad', locked: true });
    }
  }
  // Puertas exteriores y ventana
  const fr = room(front);
  const frontDoor = door(rint(fr.x0, fr.x1), by1, { name: 'Puerta principal', outer: true, unlockedBy: null });
  const backRoom = office >= 0 ? room(office) : room(vault);
  const backDoor = door(rint(backRoom.x0, backRoom.x1), by0, { name: 'Puerta de atrás', outer: true, locked: !cfg.prep.has('conserje') });
  // Ventana en un muro lateral de una pieza que no sea la bóveda
  const winOpts = [];
  for (const id of [front, office, security].filter((r) => r >= 0)) {
    const w = room(id);
    if (w.x0 === ix0) winOpts.push({ x: bx0, w });
    if (w.x1 === ix1) winOpts.push({ x: bx1, w });
  }
  const wo = pick(winOpts);
  if (wo) H.cells[rint(wo.w.y0, wo.w.y1)][wo.x] = { t: 'window', room: -1, name: 'Ventana' };
  H.frontDoor = frontDoor; H.backDoor = backDoor;

  // Tablero eléctrico (para el hacker) y caja de luz en la calle
  const panelRoom = security >= 0 ? security : office >= 0 ? office : vault;
  H.panel = freeCell(H, panelRoom);
  H.panelCell = H.panel;
  H.box = { x: 0, y: rint(by0 + 1, by1 - 1) };
  // Retén de Carabineros: esquina de arriba más lejana de la puerta principal
  H.reten = frontDoor.x < cols / 2 ? { x: cols - 1, y: 0 } : { x: 0, y: 0 };

  // Botín
  placeLoot(H, cfg);
  // Cámaras
  const nc = Math.min(6, tier + 1 + cfg.memory);
  const camRooms = [vault, front, office, security].filter((r) => r >= 0);
  for (let i = 0; i < nc; i++) placeCam(H, camRooms[i % camRooms.length]);
  if (tier >= 3) H.cams.push({ x: frontDoor.x + (frontDoor.x > cols / 2 ? -2 : 2), y: rows - 1, dir: [0, -1], street: true });
  // Guardias
  const ng = Math.min(4, 1 + Math.floor((tier - 1) / 2) + (cfg.event === 'pago' ? 1 : 0) + (cfg.daytime ? 1 : 0) + Math.min(1, cfg.memory));
  const gRooms = [front, vault, office, security].filter((r) => r >= 0);
  for (let i = 0; i < ng; i++) placeGuard(H, gRooms[i % gRooms.length], gRooms[(i + 1) % gRooms.length]);
  if (cfg.prep.has('guardia') && H.guards.length) pick(H.guards).bribed = true;

  // Salidas a pie
  const fl = CITY_FLAVOR[cfg.city] || { exits: [] };
  const spots = shuffle([{ x: 2, y: rows - 1 }, { x: cols - 3, y: rows - 1 }, { x: 0, y: rows - 1 }, { x: cols - 1, y: rows - 1 }, { x: cols - 1, y: 1 }]);
  H.exits = [];
  const kinds = ['paradero', ...shuffle(fl.exits).slice(0, 2)];
  kinds.forEach((k, i) => { const s = spots[i]; H.exits.push({ ...s, k, n: FOOT_EXITS[k].n, closed: k === 'paradero' && cfg.event === 'paro' }); });
  // Túnel
  H.tunnel = null; H.grate = null;
  if (cfg.prep.has('tunel') && !cfg.tunnelCollapsed) {
    H.tunnel = freeCell(H, vault);
    H.grate = { x: H.reten.x === 0 ? cols - 2 : 1, y: 0 };
  }
  // Lugares posibles para el vehículo
  const my = Math.floor(rows / 2);
  H.spots = [{ x: 0, y: my + 1, n: 'Calle lateral' }, { x: cols - 1, y: my - 1, n: 'Calle lateral' }, { x: Math.floor(cols / 2), y: 0, n: 'Callejón' }, { x: Math.floor(cols / 2) + 2, y: rows - 1, n: 'Calle principal' }]
    .filter((s) => !H.exits.some((e) => e.x === s.x && e.y === s.y) && !(s.x === H.box.x && s.y === H.box.y) && !(H.reten.x === s.x && H.reten.y === s.y));
  // McCuack de civil camina alrededor de la cuadra
  if (cfg.mcc) {
    const loop = [];
    for (let x = 0; x < cols; x++) loop.push([x, rows - 1]);
    for (let y = rows - 2; y >= 0; y--) loop.push([cols - 1, y]);
    for (let x = cols - 2; x >= 0; x--) loop.push([x, 0]);
    for (let y = 1; y < rows - 1; y++) loop.push([0, y]);
    const i0 = rint(0, loop.length - 1);
    H.mcc = { path: loop, i: i0, x: loop[i0][0], y: loop[i0][1], dir: [1, 0] };
  }
  // Puntos de partida
  H.start = [
    { x: frontDoor.x, y: rows - 1, n: 'Calle principal' },
    { x: backDoor.x, y: 0, n: 'Callejón de atrás' },
  ];
  if (H.grate) H.start.push({ ...H.grate, n: 'Alcantarilla del túnel' });
  if (H.disguise) { const c = freeCell(H, office >= 0 ? office : front); H.start.push({ ...c, n: 'Adentro, de aseador', inside: true }); }
  // Lo que viste vigilando: primero el local, después las demás piezas
  if (cfg.recon && !cfg.prep.has('planos')) {
    const order = [front, office, security, vault].filter((r) => r >= 0);
    order.slice(0, cfg.recon).forEach((r) => { H.rooms[r].seen = true; });
  }
  if (!cfg.vehicle) H.phase = 'entry';
  return H;
}

function freeCell(H, roomId) {
  const r = H.rooms[roomId];
  const taken = (x, y) => H.items.some((i) => i.x === x && i.y === y) || H.cams.some((c) => c.x === x && c.y === y) || (H.panel && H.panel.x === x && H.panel.y === y) || (H.tunnel && H.tunnel.x === x && H.tunnel.y === y);
  for (let n = 0; n < 60; n++) {
    const x = rint(r.x0, r.x1), y = rint(r.y0, r.y1);
    if (!taken(x, y)) return { x, y };
  }
  return { x: r.x0, y: r.y0 };
}

function placeLoot(H, cfg) {
  const { cr, tier } = cfg;
  const boost = (cfg.event === 'pago' ? 1.3 : 1) * (cfg.daytime ? 1.25 : 1);
  const ids = H.ids;
  const add = (roomId, tpl, value) => { const c = freeCell(H, roomId); H.items.push({ id: H.items.length, ...c, ...tpl, value: Math.round(value / 1000) * 1000 }); };
  if (cr.kind === 'cash') {
    const n = 3 + tier;
    const tpls = Array.from({ length: n }, () => pick(LOOT.cash));
    const pot = cr.cash * 1.6 * boost, sum = tpls.reduce((a, t) => a + t.v, 0);
    tpls.forEach((t, i) => add(i === n - 1 && tier <= 2 ? ids.front : ids.vault, t, (pot * t.v) / sum));
  } else {
    const isGold = cr.gn === 'oro';
    const g = cr.kind === 'art' ? LOOT.art : isGold ? LOOT.gold : LOOT.goods;
    const n = cr.kind === 'art' ? 1 : tier >= 5 ? 5 : 4;
    for (let i = 0; i < n; i++) add(ids.vault, g[0], cr.kind === 'art' ? 0 : (cr.lootVal * 1.4 * boost) / n);
    // Caja chica con efectivo para la fuga
    const cashRoom = ids.office >= 0 ? ids.office : ids.front;
    add(cashRoom, { k: 'caja', n: 'Caja chica', w: 1, v: 1 }, cr.cash * 0.6 * boost);
    add(ids.front, { k: 'caja', n: 'Caja registradora', w: 1, v: 1 }, cr.cash * 0.5 * boost);
  }
  if (cfg.contract && cfg.contract.id === 'reloj') add(ids.office >= 0 ? ids.office : ids.vault, { k: 'reloj', n: 'Reloj del gerente', w: 1, special: true }, 300000);
}

function placeCam(H, roomId) {
  const r = H.rooms[roomId];
  // En un borde de la pieza, mirando hacia adentro
  const side = rint(0, 3);
  const c = side === 0 ? { x: rint(r.x0, r.x1), y: r.y0, dir: [0, 1] } : side === 1 ? { x: rint(r.x0, r.x1), y: r.y1, dir: [0, -1] } : side === 2 ? { x: r.x0, y: rint(r.y0, r.y1), dir: [1, 0] } : { x: r.x1, y: rint(r.y0, r.y1), dir: [-1, 0] };
  if (H.cams.some((k) => k.x === c.x && k.y === c.y)) return;
  H.cams.push({ ...c, room: roomId });
}

function placeGuard(H, roomA, roomB) {
  const a = freeCell(H, roomA), b = freeCell(H, roomB), c = freeCell(H, roomA);
  // La ronda va solo por adentro (los guardias tienen llave de las puertas interiores)
  const walk = (p) => { const c = cell(H, p.x, p.y); return !!c && (c.t === 'floor' || (c.t === 'door' && !c.outer)); };
  const path = [...(bfs(H, a, b, walk) || [a]), ...(bfs(H, b, c, walk) || []).slice(1), ...(bfs(H, c, a, walk) || []).slice(1)];
  if (path.length > 1 && path[path.length - 1].x === path[0].x && path[path.length - 1].y === path[0].y) path.pop();
  H.guards.push({ x: a.x, y: a.y, path, i: 0, dir: [0, 1], mode: 'patrol', target: null, timer: 0, home: roomA });
}

// ---------- Mapa ----------
export const cell = (H, x, y) => (x >= 0 && y >= 0 && x < H.cols && y < H.rows ? H.cells[y][x] : null);
export const inside = (H, x, y) => { const c = cell(H, x, y); return !!c && c.room >= 0; };
const blocksSight = (c) => !c || c.t === 'wall' || (c.t === 'door' && !c.open) || (c.t === 'window' && !c.broken);
export function playerWalkable(H, x, y) {
  const c = cell(H, x, y);
  if (!c) return false;
  if (c.t === 'street' || c.t === 'floor') return true;
  if (c.t === 'door') return c.open || !c.locked;
  if (c.t === 'window') return !!c.broken;
  return false;
}
function guardWalkable(H, x, y) {
  const c = cell(H, x, y);
  return !!c && (c.t === 'floor' || c.t === 'door' || (c.t === 'window' && c.broken) || c.t === 'street');
}
const streetOnly = (H, x, y) => { const c = cell(H, x, y); return !!c && c.t === 'street'; };

export function bfs(H, from, to, ok) {
  const q = [[from.x, from.y]], prev = new Map([[key(from.x, from.y), null]]);
  while (q.length) {
    const [x, y] = q.shift();
    if (x === to.x && y === to.y) {
      const path = [];
      let k = key(x, y);
      while (k) { const [a, b] = k.split(',').map(Number); path.unshift({ x: a, y: b }); k = prev.get(k); }
      return path;
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k) || !cell(H, nx, ny)) continue;
      if (!(nx === to.x && ny === to.y) && !ok({ x: nx, y: ny })) continue;
      prev.set(k, key(x, y));
      q.push([nx, ny]);
    }
  }
  return null;
}

// Línea de visión (sin muros ni puertas cerradas entre medio)
function los(H, a, b) {
  let x0 = a.x, y0 = a.y;
  const dx = Math.abs(b.x - x0), dy = Math.abs(b.y - y0), sx = x0 < b.x ? 1 : -1, sy = y0 < b.y ? 1 : -1;
  let err = dx - dy;
  while (!(x0 === b.x && y0 === b.y)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
    if (x0 === b.x && y0 === b.y) break;
    if (blocksSight(cell(H, x0, y0))) return false;
  }
  return true;
}
// Cono de visión: hasta r casillas hacia adelante, abriéndose a los lados
export function cone(H, o, dir, r) {
  const out = [];
  for (let d = 1; d <= r; d++) {
    const w = d >= 3 ? 1 : 0;
    for (let s = -w; s <= w; s++) {
      const x = o.x + dir[0] * d + (dir[1] !== 0 ? s : 0), y = o.y + dir[1] * d + (dir[0] !== 0 ? s : 0);
      const c = cell(H, x, y);
      if (!c || c.t === 'wall') continue;
      if (los(H, o, { x, y })) out.push({ x, y });
    }
  }
  return out;
}
const sees = (H, o, dir, r, p) => cone(H, o, dir, r).some((c) => c.x === p.x && c.y === p.y);
export const sightR = (H) => (['lluvia', 'partido'].includes(H.cfg.event) ? 2 : 3);
export const camsActive = (H) => H.camsOff <= 0 && H.inhib <= 0;
export const roomAt = (H, x, y) => { const c = cell(H, x, y); return c && c.room >= 0 ? H.rooms[c.room] : null; };
export const weight = (H) => H.carried.reduce((a, i) => a + i.w, 0);
export const totalLoot = (H) => H.items.reduce((a, i) => a + (i.value || 0), 0) + H.carried.reduce((a, i) => a + (i.value || 0), 0);

// Lo que se ve: piezas visitadas (o todas con los planos)
export function revealAround(H) {
  const p = H.player;
  const here = roomAt(H, p.x, p.y);
  if (here) here.seen = true;
  // Asomarse por una puerta abierta o una ventana rota
  for (const [dx, dy] of DIRS) {
    const c = cell(H, p.x + dx, p.y + dy);
    if (c && ((c.t === 'door' && (c.open || !c.locked)) || (c.t === 'window' && c.broken))) {
      const r2 = roomAt(H, p.x + dx * 2, p.y + dy * 2);
      if (r2) r2.seen = true;
    }
  }
}
export const known = (H, x, y) => { const c = cell(H, x, y); if (!c) return false; if (c.room < 0) return true; return H.rooms[c.room].seen; };

// ---------- Turnos ----------
const say = (H, t, cls = '') => { H.log.push({ t, cls, turn: H.turn }); if (H.log.length > 40) H.log.shift(); };
const addNoise = (H, n, at) => {
  if (n <= 0) return;
  H.noise = Math.min(10, H.noise + n);
  if (n >= 2 && !H.alarm) {
    for (const g of H.guards) if (g.mode === 'patrol' && man(g, at) <= 5 && !g.bribed) { g.mode = 'invest'; g.target = { ...at }; g.timer = 5; }
  }
  if (H.noise >= 10) raise(H, 'El ruido alertó a todo el barrio: ¡suena la alarma!');
};
function raise(H, why) {
  if (H.alarm) return;
  H.alarm = true;
  H.alarmTurn = H.turn;
  const cfg = H.cfg;
  H.patrolIn = 3 + (cfg.prep.has('llamada') ? 5 : 0) + (cfg.crew.campana && cfg.crew.campana.delay ? cfg.crew.campana.delay : 0) + (cfg.event === 'partido' ? 3 : 0);
  say(H, `${why} Carabineros llega en ${H.patrolIn} turnos.`, 'bad');
  for (const g of H.guards) if (!g.bribed) { g.mode = 'chase'; g.last = { ...H.player }; g.lost = 0; }
}

function stepToward(H, a, target, ok) {
  const path = bfs(H, a, target, ok);
  if (path && path.length > 1) { const n = path[1]; a.dir = [Math.sign(n.x - a.x), Math.sign(n.y - a.y)]; a.x = n.x; a.y = n.y; return true; }
  return false;
}

function tick(H) {
  H.turn++;
  const cfg = H.cfg, p = H.player;
  if (H.turn % (cfg.event === 'lluvia' ? 1 : 2) === 0) H.noise = Math.max(0, H.noise - 1);
  if (H.camsOff > 0 && H.camsOff !== Infinity) H.camsOff--;
  if (H.inhib > 0) H.inhib--;
  if (H.turn === H.quakeAt) { H.camsOff = Math.max(H.camsOff, 5); say(H, '¡Temblor! Se cortó la luz: las cámaras están apagadas por 5 turnos.', 'good'); }
  // Guardias
  for (const g of H.guards) {
    if (g.mode === 'chase' && !g.bribed) {
      // Persigue hasta donde te vio por última vez; si te pierde varios turnos, vuelve a su ronda buscando
      if (sees(H, g, g.dir, sightR(H) + 1, p) || man(g, p) <= 1) { g.last = { x: p.x, y: p.y }; g.lost = 0; }
      else g.lost = (g.lost || 0) + 1;
      if (g.lost >= 4 || !g.last) { g.mode = 'return'; g.lost = 0; continue; }
      stepToward(H, g, g.last, (c) => guardWalkable(H, c.x, c.y));
      continue;
    }
    if (g.mode === 'invest') {
      if (g.timer-- <= 0 || (g.x === g.target.x && g.y === g.target.y)) { g.mode = 'return'; }
      else { stepToward(H, g, g.target, (c) => guardWalkable(H, c.x, c.y)); continue; }
    }
    if (g.mode === 'return') {
      const home = g.path[g.i];
      if (g.x === home.x && g.y === home.y) g.mode = 'patrol';
      else { stepToward(H, g, home, (c) => guardWalkable(H, c.x, c.y)); continue; }
    }
    // En ronda caminan sin apuro: un paso cada dos turnos
    if (g.path.length > 1 && H.turn % 2 === 0) {
      g.i = (g.i + 1) % g.path.length;
      const n = g.path[g.i];
      const d = [Math.sign(n.x - g.x), Math.sign(n.y - g.y)];
      if (d[0] || d[1]) g.dir = d;
      g.x = n.x; g.y = n.y;
    }
  }
  // McCuack de civil
  if (H.mcc) {
    const m = H.mcc;
    if (H.alarm) stepToward(H, m, p, (c) => streetOnly(H, c.x, c.y));
    else { m.i = (m.i + 1) % m.path.length; const n = m.path[m.i]; m.dir = [Math.sign(n[0] - m.x), Math.sign(n[1] - m.y)]; m.x = n[0]; m.y = n[1]; }
  }
  // Patrullas
  if (H.alarm && H.patrolIn != null) {
    if (H.patrolIn > 0) H.patrolIn--;
    else if (!H.patrols.length) {
      H.patrols.push({ x: H.reten.x, y: H.reten.y, dir: [0, 1] }, { x: H.reten.x, y: H.reten.y, dir: [0, 1], blocker: true });
      say(H, '¡Llegaron las patrullas de Carabineros!', 'bad');
    }
    const slow = cfg.event === 'feria' && H.turn % 2 === 1;
    if (!slow) {
      for (const k of H.patrols) {
        const veh = H.vehicles.find((v) => !v.b) || H.vehicles[0];
        const target = k.blocker && veh ? veh : p.y >= H.rows - 2 || p.y <= 1 || p.x === 0 || p.x === H.cols - 1 ? p : { x: H.frontDoor.x, y: H.rows - 2 };
        stepToward(H, k, target, (c) => streetOnly(H, c.x, c.y));
      }
    }
  }
  check(H);
}

// ¿Quién te ve? ¿Te atraparon?
function check(H) {
  if (H.over) return;
  const p = H.player, r = sightR(H);
  const loaded = H.carried.length > 0;
  // Cámaras
  if (camsActive(H)) {
    for (const c of H.cams) {
      if (c.rec) continue;
      if (sees(H, c, c.dir, 3, p)) {
        if (H.disguise && !loaded) continue;
        c.rec = true; H.recorded = true;
        say(H, '¡Te grabó una cámara!', 'warn');
        addNoise(H, 1, c);
      }
    }
  }
  // Guardias: la primera vez que te ven de lejos sospechan y van a mirar; si te vuelven a ver, alarma.
  for (const g of H.guards) {
    if (g.bribed) continue;
    if (H.alarm && g.x === p.x && g.y === p.y) { caughtIn(H, 'Un guardia te agarró del cuello de la chaqueta.'); return; }
    if (H.alarm) {
      // Con la alarma sonando, si te vuelve a ver, te persigue de nuevo
      if (g.mode !== 'chase' && sees(H, g, g.dir, r + 1, p)) { g.mode = 'chase'; g.last = { x: p.x, y: p.y }; g.lost = 0; }
      continue;
    }
    if (sees(H, g, g.dir, r, p) && !(H.disguise && !loaded)) {
      // Sospecha: sube más rápido mientras más cerca estés
      const d = man(g, p);
      g.sus = (g.sus || 0) + (d <= 1 ? 2 : d <= 2 ? 1 : 0.6);
      if (g.sus >= 3) { H.seenGuard = true; raise(H, '¡Un guardia te vio!'); }
      else {
        if (g.mode !== 'invest') say(H, 'Un guardia vio algo raro y viene a mirar. ¡Escóndete!', 'warn');
        g.mode = 'invest'; g.target = { x: p.x, y: p.y }; g.timer = 4;
      }
    } else if (g.sus) g.sus = Math.max(0, g.sus - 1);
  }
  // McCuack
  if (H.mcc && !H.mccSaw && sees(H, H.mcc, H.mcc.dir, 4, p)) {
    H.mccSaw = true;
    if (loaded || H.forced) raise(H, 'McCuack te reconoció en la calle con el botín.');
    else say(H, 'McCuack pasó por tu lado y te miró raro. Eso no va a quedar ahí.', 'warn');
  }
  if (H.mcc && H.alarm && H.mcc.x === p.x && H.mcc.y === p.y) { caughtIn(H, 'McCuack en persona te puso las esposas.'); return; }
  // Patrullas: te atrapan si te alcanzan en la calle
  for (const k of H.patrols) if (k.x === p.x && k.y === p.y) { caughtIn(H, 'Una patrulla te cerró el paso en la calle.'); return; }
}
function caughtIn(H, msg) { H.over = { caught: true, msg }; say(H, msg, 'bad'); }

// Gasta n turnos (se corta si te atrapan)
function spend(H, n) { for (let i = 0; i < n && !H.over; i++) tick(H); }

// ---------- Acciones del jugador ----------
export function placeVehicle(H, i, kind) {
  const s = H.spots[i];
  if (!s || H.vehicles.some((v) => v.x === s.x && v.y === s.y)) return false;
  H.vehicles.push({ x: s.x, y: s.y, k: kind, b: H.vehicles.length > 0 });
  return true;
}
export function chooseStart(H, i) {
  const s = H.start[i];
  H.player = { x: s.x, y: s.y };
  H.phase = 'play';
  if (s.inside) say(H, 'Empiezas adentro, con el uniforme de aseador. Nadie te mira… por ahora.', 'good');
  else say(H, `Llegas a ${s.n.toLowerCase()}.`);
  revealAround(H);
  check(H);
}

export const moveCost = (H) => (weight(H) > HEAVY ? 2 : 1);

// Un paso hacia una casilla vecina
export function step(H, x, y) {
  if (H.over || H.phase !== 'play') return false;
  const p = H.player;
  if (man(p, { x, y }) !== 1 || !playerWalkable(H, x, y)) return false;
  if (H.guards.some((g) => g.x === x && g.y === y)) return false;
  const c = cell(H, x, y);
  if (c.t === 'door') c.open = true;
  p.x = x; p.y = y;
  revealAround(H);
  spend(H, moveCost(H));
  return true;
}

// Camino hasta una casilla conocida (para caminar varios pasos con un toque)
export function pathTo(H, x, y) {
  if (!known(H, x, y) || !playerWalkable(H, x, y)) return null;
  return bfs(H, H.player, { x, y }, (c) => playerWalkable(H, c.x, c.y) && known(H, c.x, c.y));
}

const adjDoors = (H) => DIRS.map(([dx, dy]) => ({ x: H.player.x + dx, y: H.player.y + dy })).filter((q) => { const c = cell(H, q.x, q.y); return c && ((c.t === 'door' && c.locked && !c.open) || (c.t === 'window' && !c.broken)); });
const near = (H, q) => q && man(H.player, q) <= 1;

// Acciones posibles donde estás
export function actions(H) {
  if (H.over || H.phase !== 'play') return [];
  const out = [], p = H.player, crew = H.cfg.crew;
  for (const d of adjDoors(H)) {
    const c = cell(H, d.x, d.y), arg = `${d.x},${d.y}`;
    if (c.t === 'window') { out.push({ id: 'window', arg, n: 'Romper la ventana', d: '1 turno · ruido fuerte' }); continue; }
    if (c.armored) {
      if (crew.hacker && crew.hacker.opener) out.push({ id: 'byte', arg, n: `${c.name}: Byte la abre`, d: '2 turnos · sin ruido' });
      if (H.tools.esmeril > 0) out.push({ id: 'esmeril', arg, n: `${c.name}: esmeril`, d: `1 turno · mucho ruido · quedan ${H.tools.esmeril}` });
      out.push({ id: 'force', arg, n: `${c.name}: forzar a mano`, d: '6 turnos · algo de ruido', heavy: true });
    } else {
      if (H.tools.ganzua > 0) out.push({ id: 'ganzua', arg, n: `${c.name}: ganzúa`, d: `1 turno · silencio · quedan ${H.tools.ganzua}` });
      if (H.tools.esmeril > 0) out.push({ id: 'esmeril', arg, n: `${c.name}: esmeril`, d: `1 turno · mucho ruido · quedan ${H.tools.esmeril}` });
      out.push({ id: 'force', arg, n: `${c.name}: forzar`, d: '3 turnos · algo de ruido' });
    }
  }
  const it = H.items.find((i) => i.x === p.x && i.y === p.y);
  if (it) out.push({ id: 'take', arg: String(it.id), n: `Tomar: ${it.n}`, d: `${it.w} kg${weight(H) + it.w > HEAVY ? ' · te pone lento' : ''}`, disabled: weight(H) + it.w > CAPACITY, why: 'La mochila no da para más' });
  if (H.carried.length) out.push({ id: 'drop', n: `Soltar: ${H.carried[H.carried.length - 1].n}`, d: '1 turno' });
  if (crew.hacker && near(H, H.panel) && H.camsOff !== Infinity) out.push({ id: 'cams', n: `Tablero: ${crew.hacker.n} corta las cámaras`, d: `2 turnos · ${crew.hacker.camsForever ? 'para siempre' : '8 turnos'}` });
  if (near(H, H.box)) out.push({ id: 'luz', n: 'Cortar la luz del barrio', d: '1 turno · cámaras apagadas 6 turnos · algo de ruido' });
  if (H.tools.inhibidor > 0 && H.inhib <= 0) out.push({ id: 'inhib', n: 'Prender el inhibidor', d: 'Las cámaras no te graban por 6 turnos' });
  if (!H.usedAuto && streetOnly(H, p.x, p.y)) out.push({ id: 'autoAlarm', n: 'Hacer sonar la alarma de un auto', d: 'Los guardias van a mirar a la puerta principal' });
  if (H.tunnel && p.x === H.tunnel.x && p.y === H.tunnel.y) out.push({ id: 'tunnel', n: 'Bajar al túnel', d: '2 turnos · sales por la alcantarilla' });
  if (H.grate && p.x === H.grate.x && p.y === H.grate.y && !H.alarm) out.push({ id: 'tunnelIn', n: 'Entrar por el túnel', d: '2 turnos · apareces en la bóveda' });
  // Salidas
  const loot = canLeave(H);
  const veh = H.vehicles.find((v) => v.x === p.x && v.y === p.y);
  if (veh) out.push({ id: 'leave', arg: 'veh', n: `Subir ${veh.k === 'auto' ? 'al auto' : 'a la moto'} y escapar`, d: veh.b ? 'Plan B' : 'Vehículo principal', primary: true, disabled: !!loot || H.patrols.some((k) => k.x === veh.x && k.y === veh.y), why: loot || 'Una patrulla está encima del vehículo' });
  const ex = H.exits.find((e) => e.x === p.x && e.y === p.y);
  if (ex) out.push({ id: 'leave', arg: 'foot', n: `${ex.n}: escapar a pie`, d: FOOT_EXITS[ex.k].d, primary: true, disabled: ex.closed || !!loot, why: ex.closed ? 'Hay paro de micros' : loot });
  if (H.grate && p.x === H.grate.x && p.y === H.grate.y && H.carried.length) out.push({ id: 'leave', arg: 'grate', n: 'Perderte por el alcantarillado', d: 'Sales lejos de aquí, a pie', primary: true, disabled: !!loot, why: loot });
  if (!H.carried.length && (veh || ex)) out.push({ id: 'abort', n: 'Abortar el golpe', d: 'Te vas con las manos vacías' });
  out.push({ id: 'wait', n: 'Esperar', d: '1 turno' });
  return out;
}

export function canLeave(H) {
  const k = H.cfg.cr.kind;
  if (!H.carried.length) return 'No llevas nada';
  if (k === 'art' && !H.carried.some((i) => i.art)) return 'Sin el óleo no te vas';
  if (k === 'goods' && !H.carried.some((i) => i.goods)) return `Sin ${H.cfg.cr.goods} no te vas`;
  return '';
}

export function act(H, id, arg) {
  if (H.over || H.phase !== 'play') return;
  const p = H.player, crew = H.cfg.crew;
  const at = arg && arg.includes(',') ? { x: +arg.split(',')[0], y: +arg.split(',')[1] } : null;
  const c = at && cell(H, at.x, at.y);
  const loseDisguise = () => { if (H.disguise) { H.disguise = false; say(H, 'Se acabó el disfraz: ahora eres un ladrón cualquiera.', 'warn'); } };
  const open = (msg) => { c.open = true; c.locked = false; revealAround(H); say(H, msg); };
  switch (id) {
    case 'force': {
      loseDisguise(); H.forced++;
      const n = c.armored ? 6 : 3;
      for (let i = 0; i < n && !H.over; i++) { addNoise(H, 1, at); tick(H); }
      if (!H.over) open(`Forzaste ${c.name.toLowerCase()}.`);
      break;
    }
    case 'ganzua': H.tools.ganzua--; H.forced++; addNoise(H, 1, at); spend(H, 1); if (!H.over) open(`Abriste ${c.name.toLowerCase()} con la ganzúa.`); break;
    case 'esmeril': loseDisguise(); H.tools.esmeril--; H.forced++; addNoise(H, c.armored ? 5 : 4, at); spend(H, 1); if (!H.over) open(`El esmeril cortó ${c.name.toLowerCase()}. ¡Qué ruido!`); break;
    case 'byte': spend(H, 2); if (!H.over) open('Byte abrió la puerta blindada desde su notebook. Ni un ruido.'); break;
    case 'window': loseDisguise(); H.forced++; c.broken = true; addNoise(H, 3, at); spend(H, 1); revealAround(H); say(H, 'Rompiste la ventana.'); break;
    case 'take': {
      const it = H.items.find((i) => i.id === Number(arg));
      if (!it || weight(H) + it.w > CAPACITY) return;
      loseDisguise();
      H.items = H.items.filter((i) => i !== it); H.carried.push(it);
      addNoise(H, it.k === 'bolsa' || it.k === 'lingote' ? 2 : 1, p);
      say(H, `Tomaste: ${it.n}.${weight(H) > HEAVY ? ' Vas cargado: cada paso te cuesta 2 turnos.' : ''}`, 'good');
      spend(H, 1);
      break;
    }
    case 'drop': { const it = H.carried.pop(); H.items.push({ ...it, x: p.x, y: p.y }); say(H, `Soltaste: ${it.n}.`); spend(H, 1); break; }
    case 'cams': spend(H, 2); if (!H.over) { H.camsOff = crew.hacker.camsForever ? Infinity : 8; say(H, `${crew.hacker.n} cortó las cámaras${crew.hacker.camsForever ? ' para siempre' : ' por 8 turnos'}.`, 'good'); } break;
    case 'luz': addNoise(H, 2, p); spend(H, 1); if (!H.over) { H.camsOff = Math.max(H.camsOff, 6); say(H, 'Se cortó la luz del barrio: las cámaras están apagadas 6 turnos.', 'good'); } break;
    case 'inhib': H.tools.inhibidor--; H.inhib = 6; say(H, 'Prendiste el inhibidor: las cámaras no te graban por 6 turnos.', 'good'); break;
    case 'autoAlarm': {
      H.usedAuto = true;
      const t = { x: H.frontDoor.x, y: H.frontDoor.y - 1 };
      for (const g of H.guards) if (!H.alarm && !g.bribed) { g.mode = 'invest'; g.target = t; g.timer = 6; }
      say(H, 'Le pegaste una patada a un auto: su alarma suena y los guardias van a mirar a la puerta.', 'good');
      spend(H, 1);
      break;
    }
    case 'tunnel': p.x = H.grate.x; p.y = H.grate.y; spend(H, 2); say(H, 'Saliste por el túnel a la alcantarilla del callejón.'); break;
    case 'tunnelIn': p.x = H.tunnel.x; p.y = H.tunnel.y; spend(H, 2); revealAround(H); say(H, 'Saliste del túnel en medio de la bóveda.', 'good'); break;
    case 'wait': spend(H, 1); break;
    case 'leave': {
      if (canLeave(H)) return;
      const veh = H.vehicles.find((v) => v.x === p.x && v.y === p.y);
      H.over = { caught: false, exit: arg === 'veh' && veh ? veh.k : arg === 'grate' ? 'alcantarilla' : (H.exits.find((e) => e.x === p.x && e.y === p.y) || {}).k };
      say(H, '¡Escapaste del lugar!', 'good');
      break;
    }
    case 'abort': H.over = { caught: false, abort: true }; break;
    default: break;
  }
}

// Resumen para armar la fuga y revisar el encargo
export function summary(H) {
  const cr = H.cfg.cr;
  const cash = H.carried.filter((i) => !i.goods && !i.art).reduce((a, i) => a + i.value, 0);
  const goods = H.carried.filter((i) => i.goods);
  const all = [...H.items, ...H.carried].filter((i) => !i.special);
  const pts = (i) => (i.goods || i.art ? 3 : 1) * (i.value || 1);
  const share = all.length ? H.carried.filter((i) => !i.special).reduce((a, i) => a + pts(i), 0) / all.reduce((a, i) => a + pts(i), 0) : 0;
  return {
    cash, goodsVal: goods.reduce((a, i) => a + i.value, 0), goodsN: goods.length, art: H.carried.some((i) => i.art),
    reloj: H.carried.some((i) => i.k === 'reloj'), share, turns: H.turn, alarm: H.alarm, recorded: H.recorded,
    seen: H.seenGuard, mccSaw: H.mccSaw, forced: H.forced, exit: H.over && H.over.exit,
    outcome: H.alarm ? 'alarm' : H.recorded || H.seenGuard || H.mccSaw ? 'witness' : 'clean',
    rapidT: 30 + 6 * cr.lvl,
  };
}
