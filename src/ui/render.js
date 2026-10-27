// Dibuja la pantalla de juego: barra superior, aviso de peligro, franja de la ciudad,
// barra de acciones y la hoja abierta. Los botones usan data-act / data-arg (ver events.js).
import { CITY, COUNTRIES, HUB } from '../data/geo.js';
import { $, esc, money, clock, store } from '../lib/util.js';
import { S, crime, me, disguised, policeHere } from '../game/state.js';
import { drawOverlay } from './map.js';
import { patoBubble } from './pato.js';
import { detBubble, detVisible } from './detective.js';
import { I } from './icons.js';
import { shortMoney } from './components.js';
import { SHEETS, SECTIONS, renderSheet } from './sheets.js';
import { playStamp } from './fx.js';
import { heatOf } from '../game/heat.js';
import { showEvent } from './screens.js';
import { inZone, checkAt, zoneRadius } from '../game/pursuit.js';
import { CONTACTS } from '../data/content.js';
import { renderDigest } from './digest.js';
import { music, musicLevel } from '../audio/sound.js';

// Estado solo de interfaz (no forma parte de la partida)
export const ui = { statsOpen: false, q: '', filter: 'cerca', lastShown: 0, game: null };

const isDesktop = () => matchMedia('(min-width: 920px)').matches;
export const sheetOpen = () => S && SECTIONS.includes(S.tab);

export function render() {
  if (!S) { renderIdle(); drawOverlay(); return; }
  // Nueva partida: reinicia el contador de rastros vistos
  if (ui.game !== S) { ui.game = S; ui.lastShown = S.traces.filter((t) => t.shown).length; ui.q = ''; ui.filter = 'cerca'; }
  if (S.tab === 'news') S.unread = 0;
  renderStats();
  renderBanner();
  renderStrip();
  renderDock();
  const open = sheetOpen();
  const sheet = $('#sheet');
  sheet.innerHTML = open || isDesktop() ? renderSheet(open ? S.tab : 'summary') : '';
  sheet.classList.toggle('open', !!open);
  $('#scrim').hidden = !open || isDesktop();
  document.body.classList.toggle('sheet-open', !!open);
  drawOverlay();
  // Un rastro nuevo descubierto: McCuack estampa "UBICADO"
  const shown = S.traces.filter((t) => t.shown);
  if (shown.length > ui.lastShown && !S.over) playStamp('ubicado', CITY[shown[shown.length - 1].city].n);
  ui.lastShown = shown.length;
  // Un evento esperando decisión
  if (S.event && !S.over) showEvent();
  renderDigest();
  // Música según el peligro
  if (!S.over) {
    music(true);
    const c = me();
    musicLevel(policeHere() || (S.police.arrive != null && S.police.target === c.id) ? 2 : S.heat >= 45 || inZone(c) || checkAt(c.id) || freshNews() ? 1 : 0);
  }
}

const freshNews = () => S.traces.some((t) => t.shown && S.hours - t.at < 3);

function renderIdle() {
  const car = store('fuga-career') || { escapes: 0, played: 0, points: 0 };
  $('#stats').innerHTML = `<span class="st">${I.target}<b>${car.escapes}/${car.played}</b><small>fugas</small></span>`;
  $('#banner').hidden = true;
  $('#strip').innerHTML = `<div class="city"><div class="c-eyebrow">Sin golpe en curso</div><h2>Elige un golpe</h2></div><div class="act-row"><button class="btn" type="button" data-act="crimes">Ver golpes disponibles</button></div>`;
  $('#dock').innerHTML = '';
  $('#sheet').innerHTML = '';
  renderDigest();
}

function renderStats() {
  const cr = crime(), ip = cr.interpol - S.hours, heat = Math.round(S.heat);
  const lvl = heat >= 70 ? 'hot' : heat >= 45 ? 'warm' : '';
  const el = $('#stats');
  el.setAttribute('aria-expanded', ui.statsOpen);
  el.classList.toggle('open', ui.statsOpen);
  el.innerHTML = `
  <span class="st">${I.clock}<b>${clock(S.hours)}</b><small>Hora</small></span>
  <span class="st ${S.cash < 200000 ? 'bad' : ''}">${I.cash}<b>${shortMoney(S.cash)}</b><small>${ui.statsOpen ? money(S.cash) : 'Efectivo'}</small></span>
  <span class="st heat ${lvl}">${I.flame}<b>${heat}</b><small>Calor en ${esc(COUNTRIES[me().c].n)}</small><i class="bar"><i style="width:${heat}%"></i></i></span>
  <span class="st ${S.id === 'fake' ? 'good' : ''}">${I.id}<b>${S.id === 'fake' ? 'Falso' : 'Real'}</b><small>Documento</small></span>
  <span class="st ${ip < 12 ? 'bad' : ''}">${I.globe}<b>${ip > 0 ? Math.ceil(ip) + ' h' : 'Activa'}</b><small>Interpol</small></span>
  ${ui.statsOpen ? `<span class="st-more">${heatTable()}<span>${S.season === 'invierno' ? 'Invierno: pasos a Argentina cerrados en el centro y sur' : 'Verano: pasos cordilleranos abiertos'} · Despierto ${Math.round(S.awake)} h de 20 · ${disguised() ? 'Disfrazado' : 'Sin disfraz'} · Última pista de la PDI: ${S.police.known ? esc(CITY[S.police.known].n) : 'ninguna'}</span></span>` : ''}`;
}

// Calor de los países donde ya se habla de ti
function heatTable() {
  const cs = [me().c, ...Object.keys(S.heatBy)].filter((c, i, a) => a.indexOf(c) === i);
  const rows = cs.map((c) => [c, Math.round(heatOf(c))]).filter(([, h]) => h >= 1).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `<span class="heat-table">${rows.map(([c, h]) => `<span class="ht ${c === me().c ? 'here' : ''}"><b>${esc(COUNTRIES[c].n)}</b><i class="bar"><i style="width:${h}%"></i></i><em>${h}</em></span>`).join('')}</span>`;
}

// El aviso más urgente, si lo hay
function renderBanner() {
  const b = $('#banner'), c = me(), po = S.police;
  let msg = '', kind = 'red';
  if (S.over) msg = '';
  else if (policeHere()) msg = `La brigada de McCuack está en ${c.n}. Cada hora aquí es un riesgo: muévete o escóndete bien.`;
  else if (po.arrive != null && po.target === c.id) msg = `La brigada de McCuack viene a ${c.n}: llega en ${Math.max(1, Math.round(po.arrive - S.hours))} h.`;
  else if (checkAt(c.id)) msg = `Control de McCuack en ${c.n}: revisan documentos en cada bus y vuelo que entra o sale.`;
  else if (S.heat >= 70) msg = `Calor ${Math.round(S.heat)}: tu cara está en todas partes. Escóndete.`;
  else if (inZone(c)) { msg = `Estás dentro de la zona de búsqueda de McCuack (${Math.round(zoneRadius())} km alrededor de ${CITY[S.zone.city].n}).`; kind = 'amber'; }
  else if ((S.alert[c.c] || -1) > S.hours) { msg = `Alerta en ${COUNTRIES[c.c].n}: controles reforzados por ${Math.ceil(S.alert[c.c] - S.hours)} h.`; kind = 'amber'; }
  else if (S.job && S.job.deadline - S.hours < 8) { msg = `Encargo: llega a ${CITY[S.job.to].n} antes de ${clock(S.job.deadline)} o la banda te delata.`; kind = 'amber'; }
  else if (S.loan && S.loan.due - S.hours < 16) { msg = `El usurero espera ${money(S.loan.owe)} antes de ${clock(S.loan.due)}.`; kind = 'amber'; }
  else if (S.awake >= 16) { msg = `Llevas ${Math.round(S.awake)} h despierto. A las 20 te duermes donde estés.`; kind = 'amber'; }
  b.hidden = !msg;
  b.className = `banner ${kind}`;
  b.innerHTML = msg ? `${I.warn}<span>${esc(msg)}</span>` : '';
}

function renderStrip() {
  const c = me(), cr = crime();
  const tags = [];
  if (S.safe.includes(c.id)) tags.push(`<span class="tag safe">${I.house}Casa segura</span>`);
  if (S.fenceKnown.includes(c.id)) tags.push(`<span class="tag amber">${I.coins}Reducidor</span>`);
  for (const k of Object.keys(CONTACTS)) if (S.contacts[k].found && S.contacts[k].city === c.id) tags.push(`<span class="tag amber">${I[CONTACTS[k].icon]}${CONTACTS[k].n}</span>`);
  if (checkAt(c.id)) tags.push(`<span class="tag hot">${I.shield}Control de McCuack</span>`);
  if (inZone(c)) tags.push(`<span class="tag hot">${I.target}Zona de búsqueda</span>`);
  if (HUB.has(c.id)) tags.push(`<span class="tag">${I.plane}Vuelos internacionales</span>`);
  if (disguised()) tags.push(`<span class="tag">${I.mask}Disfrazado</span>`);
  if (S.season === 'invierno' && ['CL', 'AR'].includes(c.c)) tags.push(`<span class="tag cold">${I.snow}Invierno</span>`);
  $('#strip').innerHTML = `<div class="city"><div class="c-eyebrow">${esc(cr.n)} · ${esc(COUNTRIES[c.c].n)}</div><h2>${esc(c.n)}</h2><div class="tags">${tags.join('')}</div></div>
  <div class="cast">${patoBubble()}${detVisible() ? detBubble() : ''}</div>`;
}

function renderDock() {
  $('#dock').innerHTML = SHEETS.map((s) => `<button type="button" class="dock-btn" data-act="sheet" data-arg="${s.id}" aria-pressed="${S.tab === s.id}">${I[s.icon]}<span>${s.n}</span>${s.id === 'news' && S.unread && S.tab !== 'news' ? `<b class="badge">${S.unread}</b>` : ''}</button>`).join('');
}

let toastTimer;
export function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}
