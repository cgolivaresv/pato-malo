// Contenido de cada hoja de acciones: Esconderse, Moverse, Plata, Bajo mundo y Noticias.
// En escritorio, con ninguna hoja elegida, se muestra el resumen.
import { CITIES, CITY, COUNTRIES, CONO, BIG, inSA } from '../data/geo.js';
import { CONTACTS } from '../data/content.js';
import { esc, money, clock, dist } from '../lib/util.js';
import { S, crime, me } from '../game/state.js';
import { modes, riskLevel } from '../game/risk.js';
import { raidRate, checkAt, inZone } from '../game/pursuit.js';
import { ASK, FORGE_CHEAP, canAsk, wanted, contactHere, shipWait, planeWait, shipRisk, planeRisk, contactPrice } from '../game/plan.js';
import { heatOf } from '../game/heat.js';
import { lotValue, offerFor, robberyRisk, ROBBERY, LOAN } from '../game/money.js';
import { I } from './icons.js';
import { decision, chips, group } from './components.js';
import { detBubble, detVisible, detFace } from './detective.js';
import { ui } from './render.js';

export const SHEETS = [
  { id: 'hide', n: 'Esconderse', icon: 'bed' },
  { id: 'move', n: 'Moverse', icon: 'route' },
  { id: 'money', n: 'Plata', icon: 'coins' },
  { id: 'under', n: 'Escape', icon: 'mask' },
  { id: 'news', n: 'Noticias', icon: 'news' },
];
export const SECTIONS = SHEETS.map((s) => s.id);

const off = () => S.over;
const broke = (m) => S.over || S.cash < m;
const whyMoney = (m) => (S.over ? 'La fuga terminó' : S.cash < m ? `Te faltan ${money(m - S.cash)}` : '');

export function renderSheet(id) {
  const meta = SHEETS.find((s) => s.id === id);
  const body = { hide, move, money: plata, under, news, summary }[id]();
  const head = meta
    ? `<header class="sh-head"><span class="sh-grip" aria-hidden="true"></span><h2>${I[meta.icon]}${meta.n}</h2><button type="button" class="sh-close" data-act="closeSheet" aria-label="Cerrar">${I.close}</button></header>`
    : '';
  return `${head}<div class="sh-body">${body}</div>`;
}

// ---------- Objetivo (resumen y noticias) ----------
function objectives() {
  const cr = crime(), o = [];
  if (cr.obj.includes('sell')) o.push([S.sold, `Vender ${cr.goods} en Sudamérica${S.lots < cr.lot.count && !S.sold ? ` (quedan ${S.lots} lotes)` : ''}${S.fenceKnown.length ? ` · reducidor en ${S.fenceKnown.map((i) => CITY[i].n).join(', ')}` : ''}`]);
  const ready = S.passQ === 'top' || S.exit;
  o.push([!!ready, ready
    ? (S.exit ? `Salida contratada: ${CONTACTS[S.exit].exit.toLowerCase()} en ${CITY[S.contacts[S.exit].city].n}` : 'Tienes pasaporte de calidad: vuela desde un aeropuerto internacional')
    : 'Armar la salida: encuentra al capitán, al piloto o al falsificador (hoja Escape)']);
  o.push([false, cr.obj.includes('deliver') ? `Salir del continente y entregar el óleo en ${CITY[S.buyer].n} (${COUNTRIES[CITY[S.buyer].c].n})` : cr.obj.includes('cross') ? `Cruzar la frontera y llegar a una casa segura fuera de Chile${S.safe.some((i) => CITY[i].c !== 'CL') ? ` (${S.safe.filter((i) => CITY[i].c !== 'CL').map((i) => CITY[i].n).join(', ')})` : ''}` : 'Salir del continente sin que te atrapen']);
  const extra = [];
  if (S.job) extra.push(`<span class="tag amber">${I.route}Paquete a ${esc(CITY[S.job.to].n)} · ${clock(S.job.deadline)}</span>`);
  if (S.loan) extra.push(`<span class="tag hot">${I.coins}Deuda ${money(S.loan.owe)} · ${clock(S.loan.due)}</span>`);
  const pk = S.perks;
  if (S.passQ) extra.push(`<span class="tag ${S.passQ === 'top' ? 'safe' : ''}">${I.id}Pasaporte ${S.passQ === 'top' ? 'de calidad' : 'barato'}</span>`);
  if (pk.quiltro) extra.push(`<span class="tag safe">${I.house}Cachupín, tu quiltro</span>`);
  if (pk.press) extra.push(`<span class="tag safe">${I.id}Credencial de prensa</span>`);
  if (pk.map) extra.push(`<span class="tag safe">${I.map}Mapa de pasos</span>`);
  if (pk.bus) extra.push(`<span class="tag safe">${I.bus}Pasaje de bus</span>`);
  if (pk.soplon) extra.push(`<span class="tag safe">${I.eye}Soplón gratis</span>`);
  if (S.hours < pk.chaosUntil) extra.push(`<span class="tag safe">${I.warn}Caos: controles caídos</span>`);
  return `<div class="dossier"><div class="dos-label">Objetivo</div>${o.map(([d, t], i) => `<div class="obj ${d ? 'done' : ''}"><b>${d ? '✓' : i + 1}</b><span>${esc(t)}</span></div>`).join('')}${extra.length ? `<div class="tags">${extra.join('')}</div>` : ''}</div>`;
}

const rewardCard = () => (S.reward ? `<div class="reward">${I.gift}<div><b>Día ${S.reward.day} libre · ${esc(S.reward.n)}</b><span>${esc(S.reward.d)}</span></div></div>` : '');

function summary() {
  return `${objectives()}${rewardCard()}${detVisible() ? '' : detBubble()}
  <p class="hint">Elige qué hacer en la barra de acciones. Toca una ciudad en el mapa para ver cómo llegar.</p>`;
}

// ---------- Esconderse ----------
// Probabilidad de redada durante h horas quedándote en esta ciudad
const raidOver = (h, base, safe) => 1 - Math.pow(1 - raidRate(base, safe) * 0.25, h / 0.25);
const raidChip = (p) => (p < 0.01 ? { riskText: 'Redada <1%', riskLvl: 0 } : { riskText: `Redada ${Math.round(p * 100)}%`, riskLvl: riskLevel(p) });

function hide() {
  const c = me(), safe = S.safe.includes(c.id);
  let h = '';
  if (safe) h += decision({ act: 'rest', arg: 'safe', primary: true, icon: I.house, title: 'Dormir 8 h en la casa segura', desc: 'Nadie registra tu nombre. El mejor escondite.', chipsHtml: chips({ h: 8, cost: 0, ...raidChip(raidOver(8, 0.04, true)) }), disabled: off() });
  h += decision({ act: 'rest', arg: 'hostal', primary: !safe, icon: I.bed, title: 'Dormir 8 h en un hostal', desc: 'Pagas en efectivo. La dueña podría reconocerte.', chipsHtml: chips({ h: 8, cost: 25000, ...raidChip(raidOver(8, 0.04, false)) }), disabled: broke(25000), why: whyMoney(25000) });
  h += decision({ act: 'rest', arg: 'hotel', icon: I.bed, title: 'Dormir 8 h en un hotel', desc: S.id === 'real' ? 'Registran tu documento real: la PDI lo sabrá en 3 h.' : 'Te registras con el pasaporte falso.', chipsHtml: chips({ h: 8, cost: 65000, riskText: S.id === 'real' ? 'Registra tu nombre' : `Redada ${Math.max(1, Math.round(raidOver(8, 0.05, false) * 100))}%`, riskLvl: S.id === 'real' ? 2 : riskLevel(raidOver(8, 0.05, false)) }), disabled: broke(65000), why: whyMoney(65000) });
  h += decision({ act: 'lowProfile', icon: I.clock, title: 'Quedarse encerrado 4 h', desc: 'No sales de la pieza. El calor baja un poco.', chipsHtml: chips({ h: 4, cost: 0, ...raidChip(raidOver(4, 0.03, safe)) }), disabled: off() });
  h += decision({ act: 'disguise', icon: I.mask, title: 'Teñirse y cambiar de ropa', desc: 'Durante 48 h cuesta más reconocerte en controles y redadas.', chipsHtml: chips({ h: 3, cost: 120000 }), disabled: broke(120000), why: whyMoney(120000) });
  const warn = S.police.city === c.id && S.police.arrive == null ? `<p class="hint warn">La brigada de McCuack está en ${esc(c.n)}: quedarse aquí es peligroso. Si llega mientras duermes, te despiertan las sirenas.</p>` : '';
  return `${warn}<p class="hint">Llevas <b>${Math.round(S.awake)} h</b> despierto. A las 20 h te quedas dormido donde estés. El calor baja mientras descansas.</p>${group('Opciones', h)}`;
}

// ---------- Moverse ----------
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FILTERS = [
  ['cerca', 'Cercanos'], ['cl', 'Chile'], ['vecinos', 'Vecinos'], ['sa', 'Sudamérica'], ['mundo', 'Mundo'],
];

const MODE_ICON = { air: 'plane', bus: 'bus', paso: 'boot', barco: 'ship', tren: 'train' };
const CNAME = { forger: 'Falsificador', captain: 'Capitán', pilot: 'Piloto' };
function contactFlag(id) {
  return Object.keys(CONTACTS).filter((k) => S.contacts[k].found && S.contacts[k].city === id).map((k) => `<span class="flag ok">${CNAME[k]}</span>`).join('')
    + (S.fenceKnown.includes(id) && !S.sold ? '<span class="flag ok">Reducidor</span>' : '');
}

export function destList() {
  const c = me();
  let list = CITIES.filter((x) => x.id !== c.id);
  if (ui.q.trim()) {
    const q = norm(ui.q.trim());
    list = list.filter((x) => norm(x.n).includes(q) || norm(COUNTRIES[x.c].n).includes(q));
  } else if (ui.filter === 'cl') list = list.filter((x) => x.c === 'CL');
  else if (ui.filter === 'vecinos') list = list.filter((x) => CONO.includes(x.c) && x.c !== 'CL');
  else if (ui.filter === 'sa') list = list.filter((x) => inSA(x) && !CONO.includes(x.c));
  else if (ui.filter === 'mundo') list = list.filter((x) => !inSA(x));
  list = list.map((x) => ({ x, d: dist(c, x) })).sort((a, b) => a.d - b.d);
  if (!ui.q.trim() && ui.filter === 'cerca') list = list.slice(0, 12);
  if (!list.length) return '<p class="hint">No hay ciudades con ese nombre.</p>';
  return list.map(({ x, d }) => {
    const m = modes(c.id, x.id);
    const icons = m.out.length
      ? m.out.map((o) => `<span class="mode ${o.closed ? 'closed' : 'r' + riskLevel(o.p)}" title="${o.n}${o.closed ? ': ' + o.closed : ''}">${I[MODE_ICON[o.k]]}</span>`).join('')
      : '<span class="mode none">Sin ruta directa</span>';
    const h = x.c !== c.c ? Math.round(heatOf(x.c)) : null;
    const heatTxt = h != null ? ` · <span class="heat-mini ${h >= 45 ? 'hot' : h < 15 ? 'cool' : ''}">calor ${h}</span>` : '';
    const flags = [checkAt(x.id) ? `<span class="flag chk">Control</span>` : '', S.police.city === x.id && S.police.arrive == null ? `<span class="flag cop">McCuack</span>` : S.police.arrive != null && S.police.target === x.id ? `<span class="flag cop">McCuack en camino</span>` : '', contactFlag(x.id)].join('');
    return `<button type="button" class="dest-row${S.dest === x.id ? ' sel' : ''}" data-act="dest" data-arg="${x.id}"><span class="dr-name"><b>${esc(x.n)}${flags}</b><small>${esc(COUNTRIES[x.c].n)} · ${Math.round(d).toLocaleString('es-CL')} km${heatTxt}</small></span><span class="dr-modes">${icons}</span></button>`;
  }).join('');
}

function chosen() {
  if (!S.dest) return '';
  const c = me(), t = CITY[S.dest], { d, out, note } = modes(c.id, t.id);
  const ICON = { air: I.plane, bus: I.bus, paso: I.boot, barco: I.ship, tren: I.train };
  const DESC = {
    air: S.id === 'real' || S.idBurnSecret ? 'Pide documento: con el real, la PDI sabrá tu destino en minutos.' : 'Pide documento: viajas con el pasaporte falso.',
    bus: (o) => (t.c !== c.c ? 'Cruza frontera: muestras documento en el control.' : o.id ? 'Viaje dentro del país, pero con control de documentos en la ruta.' : 'Dentro del país no piden documento, pero hay cámaras.') + (o.free ? ' Usas tu pasaje abierto.' : ''),
    paso: 'Evitas migraciones por la cordillera. Lento, caro y con patrullas.',
    barco: 'No piden documento en el muelle, pero la lista de pasajeros queda registrada.',
    tren: (o) => (t.c !== c.c ? 'Cruza frontera: muestras documento en el control de la estación.' : o.id ? 'Tren dentro del país, pero con control de documentos en el andén.' : 'Dentro del país no piden documento, pero la estación tiene cámaras.'),
  };
  const cards = out.map((o) => decision({
    act: 'travel', arg: `${t.id}|${o.k}`, primary: o.k === 'air', icon: ICON[o.k],
    title: `${o.n} a ${esc(t.n)}`,
    desc: [typeof DESC[o.k] === 'function' ? DESC[o.k](o) : DESC[o.k], ...(o.info || []), o.exit != null ? (S.passQ === 'top' ? 'Al aterrizar pasas migraciones con tu pasaporte de calidad.' : S.id === 'fake' && !S.idBurnSecret ? 'Al aterrizar, migraciones revisa tu pasaporte barato con lupa.' : 'Al aterrizar, migraciones verá tu documento real.') : ''].filter(Boolean).map(esc).join(' '),
    chipsHtml: chips({ h: o.h, cost: o.m, p: o.p, riskText: o.exit != null ? `Control ${Math.round(o.p * 100)}% · Migraciones ${Math.round(o.exit * 100)}%` : `Control ${Math.round(o.p * 100)}%`, riskLvl: riskLevel(o.exit != null ? Math.max(o.p, o.exit) : o.p) }),
    disabled: !!o.closed || broke(o.m), why: o.closed || whyMoney(o.m),
  })).join('');
  const heatThere = t.c !== c.c ? `<span class="heat-mini ${heatOf(t.c) >= 45 ? 'hot' : heatOf(t.c) < 15 ? 'cool' : ''}">${I.flame}Calor en ${esc(COUNTRIES[t.c].n)}: ${Math.round(heatOf(t.c))} (aquí ${Math.round(S.heat)})</span>` : '';
  return `<div class="chosen"><div class="ch-head"><div><div class="c-eyebrow">Destino elegido · ${Math.round(d).toLocaleString('es-CL')} km</div><b>${esc(t.n)}, ${esc(COUNTRIES[t.c].n)}</b>${heatThere}</div><button type="button" class="sh-close" data-act="dest" data-arg="" aria-label="Quitar destino">${I.close}</button></div>${note ? `<p class="hint">${esc(note)}</p>` : ''}<div class="g-list">${cards}</div></div>`;
}

function move() {
  if (S.over) return '<p class="hint">La fuga terminó.</p>';
  return `${chosen()}
  <div class="finder"><label class="search">${I.search}<input id="q" type="search" placeholder="Buscar ciudad o país" value="${esc(ui.q)}" autocomplete="off" aria-label="Buscar ciudad o país"></label>
  <div class="filters" role="group" aria-label="Filtrar destinos">${FILTERS.map(([k, n]) => `<button type="button" class="filter" data-act="filter" data-arg="${k}" aria-pressed="${!ui.q && ui.filter === k}">${n}</button>`).join('')}</div></div>
  <div class="dest-list" id="destList">${destList()}</div>
  <p class="hint">La PDI te vio por última vez en <b>${S.police.known ? esc(CITY[S.police.known].n) : 'ningún lugar'}</b>. Evita las ciudades con <span class="flag chk">Control</span>: ahí revisan documentos en cada bus y vuelo. Los iconos muestran el riesgo de cada medio: verde bajo, naranjo medio, rojo alto, tachado cerrado. Cada país tiene su propio calor: donde nadie te conoce, los controles son más fáciles.</p>`;
}

// ---------- Plata ----------
function plata() {
  const c = me(), cr = crime();
  let botin = '';
  if (S.lots > 0) {
    const v = lotValue();
    botin += decision({ act: 'sellLot', icon: I.coins, title: `Vender ${esc(cr.lot.n)} en la calle`, desc: `A mitad de precio, sin reducidor. Quedan ${S.lots}.${cr.kind === 'goods' ? ' Si vendes todos, cumples el objetivo.' : ''}`, chipsHtml: chips({ h: 2, gain: v, riskText: 'El comprador puede hablar', riskLvl: 1 }), disabled: off() });
  }
  botin += S.items.map((it, i) => decision({ act: 'sellItem', arg: i, icon: I.cash, title: `Vender ${esc(it.n.toLowerCase())}`, desc: it.risk ? 'Se puede rastrear hasta ti.' : 'No deja huella.', chipsHtml: chips({ h: 1, gain: it.v, riskText: it.risk ? 'Rastreable' : 'Limpio', riskLvl: it.risk > 0.15 ? 1 : 0 }), disabled: off() })).join('');

  let trabajos = '';
  const o = offerFor(c.id);
  if (S.job) trabajos += `<div class="note-card">${I.route}<span>Encargo en curso: llevar un paquete a <b>${esc(CITY[S.job.to].n)}</b> antes de ${clock(S.job.deadline)}. Te pagan ${money(S.job.rest)} al llegar.</span></div>`;
  else if (o) trabajos += decision({ act: 'acceptJob', icon: I.route, title: `Llevar un paquete a ${esc(CITY[o.to].n)}`, desc: `Una banda paga ${money(o.total)}: ${money(o.adv)} ahora y el resto al entregar, en menos de ${o.hours} h. Si fallas, te delatan.`, chipsHtml: chips({ h: 1, gain: o.adv, riskText: 'Si fallas, te delatan', riskLvl: 1 }), disabled: off() });
  const rm = robberyRisk('mini'), rc = robberyRisk('cambio');
  const range = (k) => `${ROBBERY[k].min / 1000}–${ROBBERY[k].max / 1000} mil`;
  trabajos += decision({ act: 'robbery', arg: 'mini', icon: I.warn, title: 'Asaltar un minimarket', desc: 'Plata inmediata. Deja un rastro fresco en 3 h y sube el calor.', chipsHtml: chips({ h: 2, gainRange: range('mini'), p: rm, riskText: `Te pillan ${Math.round(Math.min(0.95, rm) * 100)}%`, riskLvl: riskLevel(rm) }), disabled: off() || S.robbed[c.id + 'mini'], why: S.robbed[c.id + 'mini'] ? 'Ya lo hiciste en esta ciudad' : '' });
  if (BIG.has(c.id)) trabajos += decision({ act: 'robbery', arg: 'cambio', icon: I.warn, title: 'Asaltar una casa de cambio', desc: 'Mucha plata, mucho riesgo. Rastro en 2 h.', chipsHtml: chips({ h: 3, gainRange: `$500 mil–1,3 M`, p: rc, riskText: `Te pillan ${Math.round(Math.min(0.95, rc) * 100)}%`, riskLvl: riskLevel(rc) }), disabled: off() || S.robbed[c.id + 'cambio'], why: S.robbed[c.id + 'cambio'] ? 'Ya lo hiciste en esta ciudad' : '' });
  trabajos += S.loan
    ? decision({ act: 'repay', icon: I.coins, primary: true, title: 'Pagarle al usurero', desc: `Vence ${clock(S.loan.due)}. Si no pagas, vende tu paradero.`, chipsHtml: chips({ cost: S.loan.owe }), disabled: broke(S.loan.owe), why: whyMoney(S.loan.owe) })
    : decision({ act: 'borrow', icon: I.coins, title: 'Pedir plata al usurero', desc: `Devuelves ${money(LOAN.owe)} en ${LOAN.hours} h o vende tu paradero.`, chipsHtml: chips({ h: 1, gain: LOAN.amount, riskText: 'Deuda con plazo', riskLvl: 1 }), disabled: off() });
  return `${cr.marked ? '<p class="hint">Tus billetes están marcados: cada pago de $150.000 o más puede delatarte.</p>' : ''}
  ${botin ? group('Vender', botin) : ''}${group('Trabajos del bajo mundo', trabajos)}`;
}

const cr0 = () => crime();
// ---------- Escape ----------
const WHERE = {
  forger: 'Trabaja en una ciudad grande de Sudamérica.',
  captain: 'Opera desde un puerto del Pacífico o del Atlántico.',
  pilot: 'Vuela desde una zona remota: el norte, la Patagonia o Bolivia.',
  get fence() { return `Compra ${S && crime().gn ? crime().gn : 'joyas'} en alguna ciudad de Chile, Argentina, Perú o Bolivia.`; },
};

// Rumores agrupados: cuántas veces se repite cada lugar (los repetidos suelen ser ciertos)
function rumorLine(k) {
  const cnt = new Map();
  for (const r of S.rumors.filter((x) => x.k === k)) {
    const key = r.city ? CITY[r.city].n : COUNTRIES[r.country].n;
    cnt.set(key, (cnt.get(key) || 0) + 1);
  }
  if (!cnt.size) return '';
  return `<div class="rumors">${I.news}<span>Rumores: ${[...cnt].sort((a, b) => b[1] - a[1]).map(([n, c]) => `<b>${esc(n)}</b>${c > 1 ? ` ×${c}` : ''}`).join(' · ')}</span></div>`;
}

const askBtn = (k) => decision({ act: 'ask', arg: k, icon: I.search, title: `Preguntar por ${k === 'fence' ? 'un reducidor' : CONTACTS[k].short} en ${esc(me().n)}`,
  desc: 'Bares y picadas. Si está aquí, lo encuentras; si no, te cuentan un rumor que puede ser falso.',
  chipsHtml: chips({ h: ASK.hours, cost: ASK.cost, riskText: `Rastro ${Math.round(ASK.trace * 100)}%`, riskLvl: 0 }),
  disabled: !canAsk(), why: S.askedAt[S.cur] === S.path.length ? 'Ya preguntaste en esta visita' : whyMoney(ASK.cost) });

function contactCard(k) {
  const K = CONTACTS[k], ct = S.contacts[k], here = contactHere(k);
  let status, acts = '';
  if (ct.found) status = `<div class="c-status ok">${I.pin}<span>${esc(K.n)} en <b>${esc(CITY[ct.city].n)}</b> · cobra ${money(contactPrice(k))}</span></div>`;
  else status = rumorLine(k) || `<div class="c-status">${I.search}<span>Nadie sabe dónde está. ${WHERE[k]}</span></div>`;
  if (!ct.found) acts += askBtn(k);
  else if (!here) acts += `<button type="button" class="btn ghost" data-act="goto" data-arg="${ct.city}">${I.route}Ver cómo llegar a ${esc(CITY[ct.city].n)}</button>`;
  else if (k === 'forger') {
    acts += S.passQ === 'top'
      ? `<p class="hint">Ya tienes su pasaporte. Vuela fuera del continente desde un aeropuerto internacional (Moverse → Mundo).</p>`
      : decision({ act: 'forgeTop', primary: true, icon: I.id, title: 'Encargar el pasaporte de calidad', desc: 'Migraciones casi no lo nota. Con él puedes volar fuera del continente.', chipsHtml: chips({ h: K.hours, cost: contactPrice(k), riskText: 'Muy seguro', riskLvl: 0 }), disabled: broke(contactPrice(k)), why: whyMoney(contactPrice(k)) });
  } else if (!ct.paid) {
    acts += decision({ act: 'hire', arg: k, primary: true, icon: I[K.icon], title: k === 'captain' ? 'Pagarle al capitán' : 'Pagarle al piloto', desc: k === 'captain' ? `El carguero zarpa en ${Math.round(shipWait())} h (dos veces por semana, a las 22:00).` : `La avioneta despega a las 03:00 (en ${Math.round(planeWait())} h).`, chipsHtml: chips({ cost: contactPrice(k) }), disabled: broke(contactPrice(k)), why: whyMoney(contactPrice(k)) });
  } else {
    const w = k === 'captain' ? shipWait() : planeWait(), p = k === 'captain' ? shipRisk() : planeRisk();
    const raid = raidOver(w, 0.04, false);
    acts += decision({ act: 'leave', arg: k, primary: true, icon: I[K.icon], title: k === 'captain' ? '¡Embarcar en el carguero!' : '¡Subir a la avioneta!', desc: `Esperas escondido ${Math.round(w)} h y sales del continente.${checkAt(S.cur) ? ' Hay un control de McCuack en la ciudad: mejor esperar a que lo levanten.' : ''}${crime().kind === 'goods' && !S.sold ? ` Antes tienes que vender ${crime().goods}.` : ''}`,
      chipsHtml: chips({ h: w, riskText: `Te atrapan ${Math.round(p * 100)}%${raid >= 0.01 ? ` · redada ${Math.round(raid * 100)}%` : ''}`, riskLvl: riskLevel(Math.max(p, raid)) }), disabled: off() || (crime().kind === 'goods' && !S.sold), why: crime().kind === 'goods' && !S.sold ? `Primero vende ${crime().goods}` : '' });
  }
  return `<section class="exit-card${ct.found ? ' found' : ''}"><header><span class="ec-ico">${I[K.icon]}</span><div><b>${esc(K.exit)}</b><small>${esc(K.exitDesc)}</small></div></header>${status}${acts}</section>`;
}

function fenceCard() {
  const c = me();
  let acts = '';
  if (S.fenceKnown.includes(c.id)) acts += decision({ act: 'sellFence', primary: true, icon: I.coins, title: `Vender ${cr0().goods} al reducidor de ${esc(c.n)}`, desc: 'Paga cerca del 1,5% de su valor por los lotes que te quedan. Cumple el objetivo.', chipsHtml: chips({ h: 4, riskText: 'Puede caer en un operativo', riskLvl: 1 }), disabled: off() });
  else if (S.fenceKnown.length) acts += `<button type="button" class="btn ghost" data-act="goto" data-arg="${S.fenceKnown[0]}">${I.route}Ver cómo llegar a ${esc(CITY[S.fenceKnown[0]].n)}</button>`;
  else acts += askBtn('fence');
  const status = S.fenceKnown.length ? `<div class="c-status ok">${I.pin}<span>Reducidor en <b>${S.fenceKnown.map((i) => esc(CITY[i].n)).join(', ')}</b></span></div>` : rumorLine('fence') || `<div class="c-status">${I.search}<span>${WHERE.fence}</span></div>`;
  return `<section class="exit-card${S.fenceKnown.length ? ' found' : ''}"><header><span class="ec-ico">${I.coins}</span><div><b>Vender ${cr0().goods}</b><small>Sin vender ${cr0().goods} no puedes salir. Un reducidor paga bien; en la calle, la mitad.</small></div></header>${status}${acts}</section>`;
}

function under() {
  const c = me(), cr = crime();
  let h = '';
  if (cr.kind === 'goods' && !S.sold) h += fenceCard();
  h += `<h3 class="g-title">Plan de escape · elige una salida</h3>`;
  h += ['forger', 'captain', 'pilot'].map(contactCard).join('');
  let extra = decision({ act: 'forgeCheap', icon: I.id, title: 'Comprar un pasaporte barato', desc: BIG.has(c.id) ? 'Sirve para moverte por Sudamérica con menos riesgo. En migraciones del extranjero se nota.' : 'Solo hay falsificadores de barrio en ciudades grandes.', chipsHtml: chips({ h: FORGE_CHEAP.hours, cost: FORGE_CHEAP.cost, riskText: 'A veces lo delatan', riskLvl: 1 }), disabled: !BIG.has(c.id) || S.id === 'fake' || broke(FORGE_CHEAP.cost), why: S.id === 'fake' ? 'Ya tienes pasaporte falso' : !BIG.has(c.id) ? 'No hay falsificadores aquí' : whyMoney(FORGE_CHEAP.cost) });
  extra += decision({ act: 'soplon', icon: I.eye, title: S.perks.soplon ? 'Llamar al soplón (gratis)' : 'Pagar al soplón de la PDI', desc: 'Te dice qué rastros tuyos está por descubrir McCuack y cuándo. Durante 24 h los ves en el mapa.', chipsHtml: chips({ h: 1, cost: S.perks.soplon ? 0 : 200000 }), disabled: S.perks.soplon ? off() : broke(200000), why: whyMoney(200000) });
  return `${h}${group('Otros contactos', extra)}<p class="hint">Los rumores pueden ser falsos: si dos personas distintas te dicen lo mismo, probablemente es cierto.</p>`;
}

// ---------- Noticias ----------
function news() {
  const list = [...S.news].reverse().map((n) => `<li class="nw ${n.cls}"><time>${clock(n.t)}</time>${n.cls === 'me' ? '' : `<img src="${detFace(n.cls === 'alert' ? 'burlon' : 'serio')}" alt="" width="22" height="22">`}<span>${esc(n.x)}</span></li>`).join('');
  return `${objectives()}${rewardCard()}${detVisible() ? '' : detBubble()}
  <h3 class="g-title">Radio y prensa</h3><ul class="feed">${list || '<li class="hint">Sin noticias por ahora.</li>'}</ul>
  <div class="act-row"><button type="button" class="btn ghost danger" data-act="surrender">Entregarse</button></div>`;
}
