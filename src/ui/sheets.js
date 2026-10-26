// Contenido de cada hoja de acciones: Esconderse, Moverse, Plata, Bajo mundo y Noticias.
// En escritorio, con ninguna hoja elegida, se muestra el resumen.
import { CITIES, CITY, COUNTRIES, CONO, BIG, inSA } from '../data/geo.js';
import { LOTS } from '../data/content.js';
import { esc, money, clock, dist } from '../lib/util.js';
import { S, crime, me } from '../game/state.js';
import { modes, riskLevel } from '../game/risk.js';
import { lotValue, offerFor, robberyRisk, ROBBERY, LOAN } from '../game/money.js';
import { I } from './icons.js';
import { decision, chips, group } from './components.js';
import { detBubble, detVisible, detFace } from './detective.js';
import { ui } from './render.js';

export const SHEETS = [
  { id: 'hide', n: 'Esconderse', icon: 'bed' },
  { id: 'move', n: 'Moverse', icon: 'route' },
  { id: 'money', n: 'Plata', icon: 'coins' },
  { id: 'under', n: 'Bajo mundo', icon: 'mask' },
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
  if (cr.obj.includes('sell')) o.push([S.sold, `Vender las joyas en Sudamérica${S.lots < LOTS.joyas.count && !S.sold ? ` (quedan ${S.lots} lotes)` : ''}${S.fenceKnown.length ? ` · reducidor en ${S.fenceKnown.map((i) => CITY[i].n).join(', ')}` : ''}`]);
  if (cr.obj.includes('leave')) o.push([false, 'Salir de Sudamérica y pasar migraciones en una capital del mundo']);
  if (cr.obj.includes('deliver')) o.push([false, `Llegar a ${CITY[S.buyer].n} (${COUNTRIES[CITY[S.buyer].c].n}) y pasar migraciones`]);
  const extra = [];
  if (S.job) extra.push(`<span class="tag amber">${I.route}Paquete a ${esc(CITY[S.job.to].n)} · ${clock(S.job.deadline)}</span>`);
  if (S.loan) extra.push(`<span class="tag hot">${I.coins}Deuda ${money(S.loan.owe)} · ${clock(S.loan.due)}</span>`);
  const pk = S.perks;
  if (pk.press) extra.push(`<span class="tag safe">${I.id}Credencial de prensa</span>`);
  if (pk.map) extra.push(`<span class="tag safe">${I.map}Mapa de pasos</span>`);
  if (pk.bus) extra.push(`<span class="tag safe">${I.bus}Pasaje de bus</span>`);
  if (pk.soplon) extra.push(`<span class="tag safe">${I.eye}Soplón gratis</span>`);
  return `<div class="dossier"><div class="dos-label">Objetivo</div>${o.map(([d, t], i) => `<div class="obj ${d ? 'done' : ''}"><b>${d ? '✓' : i + 1}</b><span>${esc(t)}</span></div>`).join('')}${extra.length ? `<div class="tags">${extra.join('')}</div>` : ''}</div>`;
}

const rewardCard = () => (S.reward ? `<div class="reward">${I.gift}<div><b>Día ${S.reward.day} libre · ${esc(S.reward.n)}</b><span>${esc(S.reward.d)}</span></div></div>` : '');

function summary() {
  return `${objectives()}${rewardCard()}${detVisible() ? '' : detBubble()}
  <p class="hint">Elige qué hacer en la barra de acciones. Toca una ciudad en el mapa para ver cómo llegar.</p>`;
}

// ---------- Esconderse ----------
function hide() {
  const c = me(), safe = S.safe.includes(c.id);
  let h = '';
  if (safe) h += decision({ act: 'rest', arg: 'safe', primary: true, icon: I.house, title: 'Dormir 8 h en la casa segura', desc: 'Nadie registra tu nombre. El mejor escondite.', chipsHtml: chips({ h: 8, cost: 0, riskText: 'Sin registro', riskLvl: 0 }), disabled: off() });
  h += decision({ act: 'rest', arg: 'hostal', primary: !safe, icon: I.bed, title: 'Dormir 8 h en un hostal', desc: 'Pagas en efectivo. La dueña podría reconocerte.', chipsHtml: chips({ h: 8, cost: 25000, riskText: 'Pueden reconocerte', riskLvl: 1 }), disabled: broke(25000), why: whyMoney(25000) });
  h += decision({ act: 'rest', arg: 'hotel', icon: I.bed, title: 'Dormir 8 h en un hotel', desc: S.id === 'real' ? 'Registran tu documento real: la policía lo sabrá en 3 h.' : 'Te registras con el pasaporte falso.', chipsHtml: chips({ h: 8, cost: 65000, riskText: S.id === 'real' ? 'Registra tu nombre' : 'Registro falso', riskLvl: S.id === 'real' ? 2 : 0 }), disabled: broke(65000), why: whyMoney(65000) });
  h += decision({ act: 'lowProfile', icon: I.clock, title: 'Quedarse encerrado 4 h', desc: 'No sales de la pieza. El calor baja un poco.', chipsHtml: chips({ h: 4, cost: 0, riskText: 'Bajo', riskLvl: 0 }), disabled: off() });
  h += decision({ act: 'disguise', icon: I.mask, title: 'Teñirse y cambiar de ropa', desc: 'Durante 48 h cuesta más reconocerte en controles y redadas.', chipsHtml: chips({ h: 3, cost: 120000 }), disabled: broke(120000), why: whyMoney(120000) });
  return `<p class="hint">Llevas <b>${Math.round(S.awake)} h</b> despierto. A las 20 h te quedas dormido donde estés. El calor baja mientras descansas.</p>${group('Opciones', h)}`;
}

// ---------- Moverse ----------
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FILTERS = [
  ['cerca', 'Cercanos'], ['cl', 'Chile'], ['vecinos', 'Vecinos'], ['sa', 'Sudamérica'], ['mundo', 'Mundo'],
];

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
      ? m.out.map((o) => `<span class="mode r${riskLevel(o.p)}" title="${o.n}">${I[o.k === 'air' ? 'plane' : o.k === 'bus' ? 'bus' : 'boot']}</span>`).join('')
      : '<span class="mode none">Sin ruta directa</span>';
    return `<button type="button" class="dest-row${S.dest === x.id ? ' sel' : ''}" data-act="dest" data-arg="${x.id}"><span class="dr-name"><b>${esc(x.n)}</b><small>${esc(COUNTRIES[x.c].n)} · ${Math.round(d).toLocaleString('es-CL')} km</small></span><span class="dr-modes">${icons}</span></button>`;
  }).join('');
}

function chosen() {
  if (!S.dest) return '';
  const c = me(), t = CITY[S.dest], { d, out, note } = modes(c.id, t.id);
  const ICON = { air: I.plane, bus: I.bus, paso: I.boot };
  const DESC = {
    air: S.id === 'real' || S.idBurnSecret ? 'Pide documento: con el real, la PDI sabrá tu destino en minutos.' : 'Pide documento: viajas con el pasaporte falso.',
    bus: (o) => (o.id ? 'Cruza frontera: muestras documento en el control.' : 'Dentro del país no piden documento, pero hay cámaras.') + (o.free ? ' Usas tu pasaje abierto.' : ''),
    paso: 'Evitas migraciones por la cordillera. Lento, caro y con patrullas.',
  };
  const cards = out.map((o) => decision({
    act: 'travel', arg: `${t.id}|${o.k}`, primary: o.k === 'air', icon: ICON[o.k],
    title: `${o.n} a ${esc(t.n)}`, desc: typeof DESC[o.k] === 'function' ? DESC[o.k](o) : DESC[o.k],
    chipsHtml: chips({ h: o.h, cost: o.m, p: o.p, riskText: `Control ${Math.round(o.p * 100)}%`, riskLvl: riskLevel(o.p) }),
    disabled: broke(o.m), why: whyMoney(o.m),
  })).join('');
  return `<div class="chosen"><div class="ch-head"><div><div class="c-eyebrow">Destino elegido · ${Math.round(d).toLocaleString('es-CL')} km</div><b>${esc(t.n)}, ${esc(COUNTRIES[t.c].n)}</b></div><button type="button" class="sh-close" data-act="dest" data-arg="" aria-label="Quitar destino">${I.close}</button></div>${note ? `<p class="hint">${esc(note)}</p>` : ''}<div class="g-list">${cards}</div></div>`;
}

function move() {
  if (S.over) return '<p class="hint">La fuga terminó.</p>';
  return `${chosen()}
  <div class="finder"><label class="search">${I.search}<input id="q" type="search" placeholder="Buscar ciudad o país" value="${esc(ui.q)}" autocomplete="off" aria-label="Buscar ciudad o país"></label>
  <div class="filters" role="group" aria-label="Filtrar destinos">${FILTERS.map(([k, n]) => `<button type="button" class="filter" data-act="filter" data-arg="${k}" aria-pressed="${!ui.q && ui.filter === k}">${n}</button>`).join('')}</div></div>
  <div class="dest-list" id="destList">${destList()}</div>
  <p class="hint">La PDI te vio por última vez en <b>${S.police.known ? esc(CITY[S.police.known].n) : 'ningún lugar'}</b>. Los iconos muestran el riesgo de cada medio: verde bajo, naranjo medio, rojo alto.</p>`;
}

// ---------- Plata ----------
function plata() {
  const c = me(), cr = crime();
  let botin = '';
  if (S.lots > 0) {
    const v = lotValue();
    botin += decision({ act: 'sellLot', icon: I.coins, title: `Vender ${esc(LOTS[cr.id].n)} en la calle`, desc: `A mitad de precio, sin reducidor. Quedan ${S.lots}.${cr.id === 'joyas' ? ' Si vendes todos, cumples el objetivo.' : ''}`, chipsHtml: chips({ h: 2, gain: v, riskText: 'El comprador puede hablar', riskLvl: 1 }), disabled: off() });
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

// ---------- Bajo mundo ----------
function under() {
  const c = me(), cr = crime();
  let h = '';
  if (cr.obj.includes('sell') && !S.sold) {
    h += S.fenceKnown.includes(c.id)
      ? decision({ act: 'sell', primary: true, icon: I.coins, title: `Vender las joyas al reducidor de ${esc(c.n)}`, desc: `Paga cerca del 0,7% del valor${S.lots < LOTS.joyas.count ? ' por los lotes que te quedan' : ''}. Cumple el objetivo.`, chipsHtml: chips({ h: 4, riskText: 'Puede caer en un operativo', riskLvl: 1 }), disabled: off() })
      : decision({ act: 'searchFence', icon: I.search, title: `Buscar reducidor en ${esc(c.n)}`, desc: 'Preguntas en bares y casas de empeño. Si aquí no compran, te darán un dato (no siempre cierto).', chipsHtml: chips({ h: 3, cost: 50000, riskText: S.searched[c.id] ? 'Ya preguntaste aquí' : 'Pueden soplar', riskLvl: 1 }), disabled: broke(50000), why: whyMoney(50000) });
  }
  h += decision({ act: 'forge', icon: I.id, title: 'Comprar un pasaporte falso', desc: BIG.has(c.id) ? 'Los controles son mucho menos peligrosos. A veces la policía llega al falsificador.' : 'Solo hay falsificadores en ciudades grandes y capitales.', chipsHtml: chips({ h: 10, cost: 900000 }), disabled: !BIG.has(c.id) || S.id === 'fake' || broke(900000), why: S.id === 'fake' ? 'Ya tienes uno' : !BIG.has(c.id) ? 'No hay falsificadores aquí' : whyMoney(900000) });
  h += decision({ act: 'soplon', icon: I.eye, title: S.perks.soplon ? 'Llamar al soplón (gratis)' : 'Pagar al soplón de la PDI', desc: 'Durante 24 h ves en el mapa dónde está McCuack y hacia dónde va.', chipsHtml: chips({ h: 1, cost: S.perks.soplon ? 0 : 200000 }), disabled: S.perks.soplon ? off() : broke(200000), why: whyMoney(200000) });
  return group('Contactos', h);
}

// ---------- Noticias ----------
function news() {
  const list = [...S.news].reverse().map((n) => `<li class="nw ${n.cls}"><time>${clock(n.t)}</time>${n.cls === 'me' ? '' : `<img src="${detFace(n.cls === 'alert' ? 'burlon' : 'serio')}" alt="" width="22" height="22">`}<span>${esc(n.x)}</span></li>`).join('');
  return `${objectives()}${rewardCard()}${detVisible() ? '' : detBubble()}
  <h3 class="g-title">Radio y prensa</h3><ul class="feed">${list || '<li class="hint">Sin noticias por ahora.</li>'}</ul>
  <div class="act-row"><button type="button" class="btn ghost danger" data-act="surrender">Entregarse</button></div>`;
}
