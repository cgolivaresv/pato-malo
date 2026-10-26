// Barra de estado y panel con las pestañas Acciones, Viajar y Noticias.
// Los botones llevan data-act (nombre de la acción) y data-arg (argumento); ver events.js.
import { CITIES, CITY, COUNTRIES, SA, BIG, HUB } from '../data/geo.js';
import { LOTS } from '../data/content.js';
import { $, esc, money, pct, clock, gmaps, street, store, clamp01 } from '../lib/util.js';
import { S, crime, me, disguised, policeHere } from '../game/state.js';
import { modes, riskLevel } from '../game/risk.js';
import { lotValue, offerFor, robberyRisk, LOAN } from '../game/money.js';
import { drawOverlay } from './map.js';
import { patoBubble } from './pato.js';
import { detBubble, detVisible, detFace } from './detective.js';

const btn = (act, arg, label, { cls = 'ghost', disabled = false } = {}) =>
  `<button class="btn ${cls}" type="button" data-act="${act}"${arg != null ? ` data-arg="${esc(arg)}"` : ''}${disabled ? ' disabled' : ''}>${label}</button>`;
const cost = (t) => `<span class="cost">${t}</span>`;
const risk = (lvl, t) => `<span class="risk r${lvl}">${t}</span>`;
const cantPay = (m) => S.over || S.cash < m;

export function render() {
  const car = store('fuga-career') || { escapes: 0, played: 0, points: 0 };
  if (!S) {
    $('#stats').innerHTML = `<div class="stat"><small>Fugas exitosas</small><b>${car.escapes} / ${car.played}</b></div>`;
    $('#panel').innerHTML = `<div class="cityhead"><div class="eyebrow">Sin golpe en curso</div><h2>Elige un golpe</h2></div><div class="tabbody">${btn('crimes', null, 'Ver golpes disponibles', { cls: '' })}</div>`;
    drawOverlay();
    return;
  }
  const cr = crime(), c = me(), ip = cr.interpol - S.hours;
  $('#stats').innerHTML = `<div class="stat"><small>Hora</small><b>${clock(S.hours)}</b></div>
  <div class="stat ${S.cash < 200000 ? 'warn' : ''}"><small>Efectivo</small><b>${money(S.cash)}</b></div>
  <div class="stat ${S.heat > 60 ? 'warn' : ''}"><small>Calor</small><b>${Math.round(S.heat)}</b><div class="heat"><span style="width:${Math.round(S.heat)}%"></span></div></div>
  <div class="stat"><small>Documento</small><b>${S.id === 'fake' ? 'Falso' : 'Real'}</b></div>
  <div class="stat ${ip < 12 ? 'warn' : ''}"><small>Interpol</small><b>${ip > 0 ? Math.ceil(ip) + ' h' : 'Activa'}</b></div>`;

  const tags = [];
  if (policeHere() && S.hours < S.soplonUntil) tags.push('<span class="tag hot">La PDI está en esta ciudad</span>');
  if ((S.alert[c.c] || -1) > S.hours) tags.push(`<span class="tag hot">Alerta en ${esc(COUNTRIES[c.c].n)}</span>`);
  if (S.safe.includes(c.id)) tags.push('<span class="tag safe">Casa segura</span>');
  if (S.fenceKnown.includes(c.id)) tags.push('<span class="tag amber">Reducidor</span>');
  if (HUB.has(c.id)) tags.push('<span class="tag">Vuelos internacionales</span>');
  if (disguised()) tags.push('<span class="tag">Disfrazado</span>');
  tags.push(`<span class="tag"><a href="${gmaps(c)}" target="_blank" rel="noopener">Google Maps ↗</a></span><span class="tag"><a href="${street(c)}" target="_blank" rel="noopener">Street View ↗</a></span>`);

  const body = S.tab === 'act' ? renderAct(c) : S.tab === 'via' ? renderVia(c) : renderNews();
  if (S.tab === 'news') S.unread = 0;
  const tabs = [['act', 'Acciones'], ['via', 'Viajar'], ['news', 'Noticias', S.unread]];
  $('#panel').innerHTML = `<div class="cityhead"><div class="eyebrow">${esc(cr.n)} · ${esc(COUNTRIES[c.c].n)}</div><h2>${esc(c.n)}</h2><div class="tags">${tags.join('')}</div>${patoBubble()}${detVisible() ? detBubble() : ''}</div>
  <div class="tabs" role="tablist">${tabs.map(([k, n, u]) => `<button role="tab" type="button" aria-selected="${S.tab === k}" data-act="tab" data-arg="${k}">${n}${u && S.tab !== k ? `<span class="n">${u}</span>` : ''}</button>`).join('')}</div>
  <div class="tabbody">${body}</div>`;
  drawOverlay();
}

function objectives() {
  const cr = crime(), o = [];
  if (cr.obj.includes('sell')) o.push([S.sold, `Vender las joyas a un reducidor en Sudamérica${S.fenceKnown.length ? ` (conocido: ${S.fenceKnown.map((i) => CITY[i].n).join(', ')})` : ''}`]);
  if (cr.obj.includes('leave')) o.push([false, 'Salir de Sudamérica y pasar migraciones en una capital del mundo']);
  if (cr.obj.includes('deliver')) o.push([false, `Llegar a ${CITY[S.buyer].n} (${COUNTRIES[CITY[S.buyer].c].n}) y pasar migraciones`]);
  const extra = [];
  if (S.job) extra.push(`<span class="tag amber">Encargo: llevar paquete a ${esc(CITY[S.job.to].n)} antes de ${clock(S.job.deadline)} · faltan ${money(S.job.rest)}</span>`);
  if (S.loan) extra.push(`<span class="tag hot">Deuda: ${money(S.loan.owe)} antes de ${clock(S.loan.due)}</span>`);
  const pk = S.perks;
  if (pk.press) extra.push('<span class="tag safe">Credencial de prensa</span>');
  if (pk.map) extra.push('<span class="tag safe">Mapa de pasos</span>');
  if (pk.bus) extra.push('<span class="tag safe">Pasaje de bus abierto</span>');
  if (pk.soplon) extra.push('<span class="tag safe">Soplón gratis</span>');
  return `<div class="card"><h3>Objetivo</h3>${o.map(([d, t], i) => `<div class="obj ${d ? 'done' : ''}"><b>${d ? '✓' : i + 1}</b><span>${esc(t)}</span></div>`).join('')}${extra.length ? `<div class="tags">${extra.join('')}</div>` : ''}</div>`;
}

function renderAct(c) {
  const cr = crime(), safe = S.safe.includes(c.id);
  let h = objectives();
  if (S.reward) h += `<div class="card reward"><div class="row"><h3>Día ${S.reward.day} sin ser atrapado</h3><span class="tag safe">${esc(S.reward.n)}</span></div><p class="small">${esc(S.reward.d)} Cada 24 h libre ganas otra recompensa.</p></div>`;

  h += `<div class="sec">Esconderse</div><div class="card"><div class="row"><h3>Dormir 8 horas</h3><span class="small">el calor baja mientras descansas</span></div><div class="act">
  ${safe ? btn('rest', 'safe', `Casa segura${cost('gratis')}${risk(0, 'sin registro')}`, { cls: '', disabled: S.over }) : ''}
  ${btn('rest', 'hostal', `Hostal en efectivo${cost(money(25000))}${risk(1, 'pueden reconocerte')}`, { cls: safe ? 'ghost' : '', disabled: cantPay(25000) })}
  ${btn('rest', 'hotel', `Hotel${cost(money(65000))}${risk(S.id === 'real' ? 2 : 0, S.id === 'real' ? 'registra tu nombre' : 'registro falso')}`, { disabled: cantPay(65000) })}
  </div><div class="act">${btn('lowProfile', null, `Quedarse encerrado 4 h${cost('gratis')}`, { disabled: S.over })}</div>
  <p class="small">Llevas ${Math.round(S.awake)} h despierto. A las 20 h te quedas dormido donde sea.</p></div>`;

  h += '<div class="sec">Bajo mundo</div>';
  if (cr.obj.includes('sell') && !S.sold) {
    h += S.fenceKnown.includes(c.id)
      ? `<div class="card"><h3>Reducidor de ${esc(c.n)}</h3>${btn('sell', null, `Vender las joyas${cost('4 h · paga cerca del 0,7% del valor')}`, { cls: '', disabled: S.over })}</div>`
      : `<div class="card"><h3>Buscar reducidor</h3><p class="small">Preguntas en bares y casas de empeño. Si aquí no compran, alguien te dará un dato (no siempre cierto).</p>${btn('searchFence', null, `Preguntar en ${esc(c.n)}${cost('3 h · ' + money(50000))}${S.searched[c.id] ? risk(1, 'ya preguntaste') : ''}`, { disabled: cantPay(50000) })}</div>`;
  }
  h += `<div class="card"><h3>Pasaporte falso</h3><p class="small">${BIG.has(c.id) ? 'Hay falsificadores en esta ciudad. A veces la policía llega a ellos.' : 'Solo en ciudades grandes y capitales.'}</p>${btn('forge', null, `${S.id === 'fake' ? 'Ya tienes uno' : 'Comprar pasaporte'}${cost('10 h · ' + money(900000))}`, { disabled: !BIG.has(c.id) || S.id === 'fake' || cantPay(900000) })}</div>
  <div class="card"><h3>Cambiar de aspecto</h3>${btn('disguise', null, `Teñirse y cambiar de ropa${cost('3 h · ' + money(120000))}`, { disabled: cantPay(120000) })}</div>
  <div class="card"><h3>Soplón en la PDI</h3><p class="small">Durante 24 h ves dónde está la brigada y hacia dónde va.</p>${btn('soplon', null, `${S.perks.soplon ? 'Llamar al soplón' : 'Pagar al soplón'}${cost('1 h · ' + (S.perks.soplon ? 'gratis' : money(200000)))}`, { disabled: S.perks.soplon ? S.over : cantPay(200000) })}</div>`;
  if (cr.marked) h += '<p class="small">Billetes marcados: cada pago de $150.000 o más puede delatarte.</p>';
  h += renderMoney(c);
  return h;
}

function renderMoney(c) {
  const cr = crime();
  let h = '<div class="sec">Conseguir dinero</div>';
  if (S.lots > 0) {
    const v = lotValue();
    h += `<div class="card"><div class="row"><h3>Vender parte del botín</h3><span class="small">quedan ${S.lots}</span></div><p class="small">Sin reducidor, a mitad de precio: ${esc(LOTS[cr.id].n)} por unos ${money(v)}.${cr.id === 'joyas' ? ' Si vendes todos los lotes, cumples el objetivo de vender las joyas.' : ''}</p>${btn('sellLot', null, `Vender en la calle${cost('2 h · +' + money(v))}${risk(1, 'el comprador puede hablar')}`, { disabled: S.over })}</div>`;
  }
  if (S.items.length) {
    h += `<div class="card"><h3>Tus cosas</h3><div class="act">${S.items.map((it, i) => btn('sellItem', i, `Vender ${esc(it.n.toLowerCase())}${cost('1 h · ~' + money(it.v))}${it.risk ? risk(it.risk > 0.15 ? 1 : 0, 'rastreable') : ''}`, { disabled: S.over })).join('')}</div></div>`;
  }
  h += '<div class="sec">Trabajos del bajo mundo</div>';
  const o = offerFor(c.id);
  if (S.job) h += `<div class="card"><h3>Encargo en curso</h3><p class="small">Llevar un paquete a ${esc(CITY[S.job.to].n)} antes de ${clock(S.job.deadline)}. Te pagan ${money(S.job.rest)} al llegar. Si no llegas, la banda te delata.</p></div>`;
  else if (o) h += `<div class="card"><div class="row"><h3>Encargo para una banda</h3><span class="small">${esc(CITY[o.to].n)}</span></div><p class="small">Llevar un paquete a ${esc(CITY[o.to].n)} en menos de ${o.hours} h. Pagan ${money(o.total)}: ${money(o.adv)} ahora y el resto al entregar.</p>${btn('acceptJob', null, `Aceptar el encargo${cost('1 h · +' + money(o.adv))}${risk(1, 'si fallas, te delatan')}`, { disabled: S.over })}</div>`;
  const pm = clamp01(robberyRisk('mini')), pc = clamp01(robberyRisk('cambio'));
  h += `<div class="card"><h3>Golpe rápido</h3><p class="small">Plata inmediata, pero deja un rastro fresco en pocas horas y sube tu calor.</p><div class="act">
  ${btn('robbery', 'mini', `Asaltar un minimarket${cost('2 h · $120.000–350.000')}${risk(riskLevel(pm), pct(pm))}`, { disabled: S.over || S.robbed[c.id + 'mini'] })}
  ${BIG.has(c.id) ? btn('robbery', 'cambio', `Asaltar una casa de cambio${cost('3 h · $500.000–1.300.000')}${risk(riskLevel(pc), pct(pc))}`, { disabled: S.over || S.robbed[c.id + 'cambio'] }) : ''}</div></div>`;
  h += S.loan
    ? `<div class="card"><h3>Usurero</h3><p class="small">Debes ${money(S.loan.owe)} antes de ${clock(S.loan.due)}.</p>${btn('repay', null, `Pagar la deuda${cost(money(S.loan.owe))}`, { cls: '', disabled: cantPay(S.loan.owe) })}</div>`
    : `<div class="card"><h3>Usurero</h3><p class="small">Te presta ${money(LOAN.amount)} ahora; devuelves ${money(LOAN.owe)} en ${LOAN.hours} h o vende tu paradero.</p>${btn('borrow', null, `Pedir el préstamo${cost('1 h · +' + money(LOAN.amount))}`, { disabled: S.over })}</div>`;
  return h;
}

function renderVia(c) {
  if (S.over) return '<p class="small">La fuga terminó.</p>';
  const groups = {};
  for (const x of CITIES) { if (x.id === c.id) continue; (groups[x.c] = groups[x.c] || []).push(x); }
  const order = Object.keys(groups).sort((a, b) => (SA.includes(b) - SA.includes(a)) || (a === 'CL' ? -1 : b === 'CL' ? 1 : COUNTRIES[a].n.localeCompare(COUNTRIES[b].n)));
  let h = `<label class="small" for="dest">Destino (también puedes tocarlo en el mapa)</label><select class="dest" id="dest"><option value="">Elige una ciudad…</option>${order.map((k) => `<optgroup label="${esc(COUNTRIES[k].n)}">${groups[k].map((x) => `<option value="${x.id}" ${S.dest === x.id ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  if (S.dest) {
    const t = CITY[S.dest], { d, out, note } = modes(c.id, t.id);
    h += `<div class="card"><div class="row"><h3>${esc(t.n)} <span class="small">${esc(COUNTRIES[t.c].n)}</span></h3><span class="small">${Math.round(d).toLocaleString('es-CL')} km</span></div>`;
    if (note) h += `<p class="small">${esc(note)}</p>`;
    h += out.map((o) => btn('travel', `${t.id}|${o.k}`, `${o.n}${cost(`${o.h.toFixed(1)} h · ${money(o.m)}`)}${risk(riskLevel(o.p), 'control ' + pct(o.p))}`, { cls: o.k === 'air' ? '' : 'ghost', disabled: cantPay(o.m) })).join('');
    h += `<p class="small">${out.some((o) => o.k === 'air') ? 'El avión pide documento: con el real, la policía sabrá tu destino en minutos. ' : ''}${out.some((o) => o.k === 'bus') ? 'El bus dentro del país no pide documento, pero hay cámaras. ' : ''}${out.some((o) => o.k === 'paso') ? 'El paso clandestino evita migraciones, pero es lento y caro.' : ''}</p></div>`;
  }
  h += `<p class="small">Tu última posición conocida por la policía: <b>${S.police.known ? esc(CITY[S.police.known].n) : 'ninguna'}</b>.</p>`;
  return h;
}

function renderNews() {
  // Las noticias de la policía llevan la cara de McCuack
  const who = (cls) => (cls === 'me' ? '' : `<img class="news-face" src="${detFace(cls === 'alert' ? 'burlon' : 'serio')}" alt="" width="20" height="20">`);
  const list = [...S.news].reverse().map((n) => `<div><time>${clock(n.t)}</time><span class="${n.cls}">${who(n.cls)}${esc(n.x)}</span></div>`).join('');
  return `${objectives()}${detVisible() ? '' : detBubble()}<div class="sec">Radio y prensa</div><div class="news">${list || '<p class="small">Sin noticias por ahora.</p>'}</div>
  <div class="act">${btn('surrender', null, 'Entregarse')}</div>`;
}

let toastTimer;
export function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}
