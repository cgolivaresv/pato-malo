// Pantallas de la carrera criminal: escalera de golpes, planificación, resultado del golpe y prontuario.
import { CRIMES, RANKS, SKILLS } from '../data/content.js';
import { CITY_FLAVOR, CREW, DAY_EVENTS, PREP, TOOLS, VEHICLES, PLAN_B_COST, ROLE_N, ROLE_D, deCapo } from '../data/heistdata.js';
import { CITY } from '../data/geo.js';
import { $, esc, money, R } from '../lib/util.js';
import { S } from '../game/state.js';
import { career, rankOf, rankName, nextRank, unlocked, buySkill, MAX_SKILL_LVL, crewInfo, afterHeist, recordRun } from '../game/career.js';
import { newPrep, member, prepCost, prepItemCost, crewCut, suspicion, mccChance, startBoard, toSetup, contractText } from '../game/heist.js';
import { openBoard } from './boardui.js';
import { I } from './icons.js';
import { PATO, face, quip } from './pato.js';
import { MCCUACK, DET_NAME, MOTTO, detFace } from './detective.js';
import { sfx } from '../audio/sound.js';

const ov = () => $('#ov');
const closeOv = () => { ov().hidden = true; ov().innerHTML = ''; };
const modal = (label, inner, cls = '') => `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${label}"><div class="tape" aria-hidden="true"></div><div class="in">${inner}</div></div>`;
const STARS = (n) => `<span class="lvl" aria-label="Dificultad ${n} de 5">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5 - n)}</span>`;
const pc = (x) => `${Math.round(x * 100)}%`;
const hrs = (h) => `${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')} ${h === 1 ? 'hora' : 'horas'}`;
const ipTxt = (h) => (isFinite(h) ? `Interpol ${h} h` : 'Sin Interpol');

// Golpe ya dado esperando la fuga
let done = null;
export const pendingHeist = () => done;

// ---------- Carrera: tarjeta resumen ----------
export function careerCard(c = career()) {
  const r = rankOf(c.xp), nx = nextRank(c.xp);
  const from = RANKS[r].xp, to = nx ? nx.xp : from;
  const p = nx ? (c.xp - from) / (to - from) : 1;
  return `<button type="button" class="career" data-act="careerOpen">
    <img src="${face(r >= 3 ? 'burlo' : 'normal')}" alt="" width="52" height="52">
    <span class="cr-body"><span class="file-no">Prontuario de Pato Malo</span><b>${esc(rankName(r))}</b>
      <span class="xp"><i style="width:${Math.round(p * 100)}%"></i></span>
      <small>${nx ? `${c.xp} / ${to} de experiencia · próximo rango: ${esc(nx.n)}` : `${c.xp} de experiencia · rango máximo`}</small></span>
    ${c.sp > 0 ? `<span class="sp-badge">${c.sp} ${c.sp === 1 ? 'punto' : 'puntos'}</span>` : `<span class="cr-go">${I.route}</span>`}
  </button>`;
}

// ---------- Elegir golpe ----------
export function showCrimes() {
  P = null;
  const c = career();
  ov().hidden = false;
  ov().innerHTML = modal('Elegir golpe', `
  <div class="hero">
    <div class="hero-txt">
      <div class="file-no">Expediente N.º ${String(c.played + 1).padStart(4, '0')} · ${c.escapes}/${c.played} fugas · ${c.points.toLocaleString('es-CL')} pts</div>
      <h1>Pato<br>Malo</h1>
      <p class="hero-quip">«Nadie atrapa a un pato con estilo.»</p>
    </div>
    <img class="hero-pato" src="${PATO}" alt="Pato Malo con gorra, lentes oscuros y chaqueta de cuero" width="299" height="514">
  </div>
  ${careerCard(c)}
  <p class="lead">Elige un golpe, prepáralo, dalo en el plano del barrio y después huye. Los golpes grandes se desbloquean a medida que Pato Malo gana experiencia.</p>
  <div class="rival"><img src="${MCCUACK}" alt="${DET_NAME}, con sombrero fedora, lentes oscuros y gabardina" width="90" height="149"><div><div class="file-no">Te persigue</div><b>${DET_NAME}</b><p>Jefe de la Brigada de Robos. Nunca duerme y nunca olvida una pista.</p><p class="rival-motto">«${MOTTO}»</p></div></div>
  <details class="rules"><summary>Cómo se juega</summary><ul>
    <li><b>Prepara el golpe</b> en una ciudad al azar: arma tu equipo, soborna, compra planos o cava un túnel. Ojo con despertar la sospecha de McCuack.</li>
    <li><b>Da el golpe por turnos</b> en el plano del barrio: esquiva guardias y cámaras, fuerza puertas y decide cuánto botín cargar. Lo que pase ahí define cómo empieza la fuga.</li>
    <li><b>No basta con tomar un avión.</b> En los golpes grandes, para salir del continente necesitas al capitán de un carguero, al piloto de una avioneta o a un falsificador maestro. Pregunta en el bajo mundo; los rumores pueden ser falsos.</li>
    <li>Cada cosa que haces puede dejar un <b>rastro</b> que la PDI descubre horas después. Ahí McCuack abre una zona de búsqueda e instala controles en las ciudades cercanas.</li>
    <li>El <b>calor</b> de cada país sube con los rastros y baja cuando te escondes. Si la brigada llega a tu ciudad, muévete.</li>
    <li>Ganas <b>experiencia</b> con cada golpe, cada día libre y cada fuga. Con ella subes de rango, desbloqueas golpes y mejoras habilidades.</li>
  </ul></details>
  <h2 class="pick">Golpes</h2>
  <div class="ladder">${RANKS.map((rk, ri) => {
    const list = CRIMES.filter((cr) => cr.rank === ri);
    const open = rankOf(c.xp) >= ri;
    return `<section class="rung${open ? '' : ' locked'}"><h3><span>${esc(rk.n)}</span>${open ? '' : `<small>${I.shield}Se desbloquea con ${rk.xp} de experiencia</small>`}</h3><div class="crimes">${list.map((cr) => `<button class="crime" type="button" data-act="start" data-arg="${cr.id}"${open ? '' : ' disabled'}>${STARS(cr.lvl)}<b>${esc(cr.n)}</b><span>${esc(cr.d)}</span><span class="meta">${I.cash}${money(cr.cash)} ${I.globe}${ipTxt(cr.interpol)}${c.best[cr.id] ? ` · ${I.gift}${c.best[cr.id].toLocaleString('es-CL')} pts` : ''}</span></button>`).join('')}</div></section>`;
  }).join('')}</div>
  ${S && !S.over ? '<div class="act-row"><button class="btn ghost" type="button" data-act="closeOv">Volver a la fuga</button></div>' : ''}`, 'start');
}

// ---------- Preparación del golpe ----------
let P = null;
export const currentPrep = () => P;
export function reopenPrep() { if (P) showPrep(); else showCrimes(); }

export function startPrep(id) {
  const cr = CRIMES.find((c) => c.id === id);
  if (!cr || !unlocked(cr)) return;
  P = newPrep(id);
  P.sunk = 0;
  showPrep();
}

export function prepSet(arg) {
  if (!P) return;
  const [k, v] = arg.split('|');
  if (k === 'crew') { const [role, id] = v.split(':'); P.crew[role] = id === 'none' ? null : id; if (role === 'chofer' && !P.crew.chofer && P.vehicle === 'auto') P.vehicle = null; }
  else if (k === 'prep') { if (P.prep.has(v)) P.prep.delete(v); else P.prep.add(v); }
  else if (k === 'tool') { const [t, d] = v.split(':'); P.tools[t] = Math.max(0, Math.min(2, P.tools[t] + Number(d))); }
  else if (k === 'veh') { P.vehicle = v === 'none' ? null : v; if (!P.vehicle) P.planB = false; }
  else if (k === 'planB') P.planB = !P.planB;
  else if (k === 'contract') P.contractOn = !P.contractOn;
  showPrep(true);
}

const card = (on, act, arg, title, desc, chipsH = '', extra = '', disabled = false, why = '') => `<button type="button" class="decision plan-opt${on ? ' on' : ''}" data-act="${act}" data-arg="${esc(arg)}" aria-pressed="${on}"${disabled ? ' disabled' : ''}>
  <span class="d-ico"><span class="tick">${on ? '✓' : ''}</span></span>
  <span class="d-body"><span class="d-title">${title}</span>${desc ? `<span class="d-desc">${desc}</span>` : ''}${chipsH}${extra}${disabled && why ? `<span class="d-why">${esc(why)}</span>` : ''}</span></button>`;
const chipsOf = (list) => (list.length ? `<span class="chips">${list.join('')}</span>` : '');

function showPrep(keepScroll) {
  const cr = P.cr, city = CITY[P.city], fl = CITY_FLAVOR[P.city], ev = DAY_EVENTS.find((e) => e.id === P.event);
  const y = keepScroll ? ov().scrollTop : 0;
  const cost = prepCost(P), cut = crewCut(P), sus = suspicion(P), mc = mccChance(P);
  const crewHtml = ['chofer', 'hacker', 'campana'].map((role) => {
    const opts = P.offer[role].map((id) => {
      const m = member(id);
      const vet = m.runs ? `<span class="chip gain">${I.gift}Veterano nv. ${m.lvl}</span>` : '';
      return card(P.crew[role] === id, 'prepSet', `crew|${role}:${id}`, esc(m.n), esc(m.d), chipsOf([`<span class="chip">${I.coins}Se lleva ${pc(m.cut)}</span>`, `<span class="chip risk ${m.sapo >= 0.1 ? 'r2' : m.sapo >= 0.05 ? 'r1' : 'r0'}">${I.shield}Sapea ${pc(m.sapo)}</span>`, vet]));
    }).join('');
    const jailed = CREW.filter((m) => m.role === role && crewInfo(m.id).jail).map((m) => `${esc(m.n)} (preso)`);
    return `<section class="group"><h3 class="g-title">${ROLE_N[role]}</h3><p class="g-note">${ROLE_D[role]}${jailed.length ? ` Presos: ${jailed.join(', ')}.` : ''}</p><div class="g-list">${opts}${card(!P.crew[role], 'prepSet', `crew|${role}:none`, `Sin ${ROLE_N[role].toLowerCase()}`, '')}</div></section>`;
  }).join('');
  const prepHtml = PREP.map((p) => card(P.prep.has(p.id), 'prepSet', `prep|${p.id}`, esc(p.n), esc(p.d), chipsOf([
    prepItemCost(P, p) ? `<span class="chip">${I.cash}${money(prepItemCost(P, p))}</span>` : '<span class="chip">Gratis</span>',
    `<span class="chip risk ${p.sus >= 20 ? 'r2' : 'r1'}">${I.target}Sospecha +${p.sus}</span>`,
    p.collapse ? `<span class="chip risk r1">${I.warn}Derrumbe ${pc(p.collapse)}</span>` : '',
  ]))).join('');
  const toolHtml = Object.entries(TOOLS).map(([k, t]) => `<div class="skill tool"><span class="d-body"><span class="d-title">${esc(t.n)} <small class="muted">×${P.tools[k]}</small></span><span class="d-desc">${esc(t.d)} ${money(t.cost)} c/u · ${t.uses} ${t.uses === 1 ? 'uso' : 'usos'}.</span></span>
    <span class="stepper"><button type="button" class="btn ghost" data-act="prepSet" data-arg="tool|${k}:-1"${P.tools[k] ? '' : ' disabled'} aria-label="Uno menos">−</button><button type="button" class="btn ghost" data-act="prepSet" data-arg="tool|${k}:1"${P.tools[k] >= 2 ? ' disabled' : ''} aria-label="Uno más">+</button></span></div>`).join('');
  const vehHtml = [
    card(!P.vehicle, 'prepSet', 'veh|none', 'A pie', 'Escapas por un paradero, el metro o lo que haya en la ciudad. Empiezas la fuga ahí mismo.'),
    card(P.vehicle === 'moto', 'prepSet', 'veh|moto', esc(VEHICLES.moto.n), esc(VEHICLES.moto.d), chipsOf([`<span class="chip">${I.cash}${money(VEHICLES.moto.cost)}</span>`])),
    card(P.vehicle === 'auto', 'prepSet', 'veh|auto', esc(VEHICLES.auto.n), esc(VEHICLES.auto.d), '', '', !P.crew.chofer, 'Necesitas un chofer'),
    P.vehicle ? card(P.planB, 'prepSet', 'planB', 'Plan B: una moto extra en otra esquina', 'Si una patrulla bloquea tu vehículo, tienes otro donde no lo esperan.', chipsOf([`<span class="chip">${I.cash}${money(PLAN_B_COST)}</span>`])) : '',
  ].join('');
  ov().hidden = false;
  ov().innerHTML = modal('Preparar el golpe', `
  <div class="file-no">Preparación · ${esc(cr.n)}</div>
  <h1 class="plan-h">${esc(city.n)}</h1>
  <p class="lead">${esc(fl.t)}</p>
  <p class="hint">Todo se paga con el botín. En el lugar decides cuánto te llevas.</p>
  ${P.memory ? `<p class="hint warn">${I.warn}Ya robaste aquí ${P.memory === 1 ? 'una vez' : `${P.memory} veces`}: hay más guardias y tu cara está en los carteles de «se busca».</p>` : ''}
  <div class="prep-cards">
    <div class="pc ev"><div class="file-no">Imprevisto del día</div><b>${esc(ev.n)}</b><span>${esc(ev.d)}</span></div>
    ${P.contract ? `<button type="button" class="pc contract${P.contractOn ? ' on' : ''}" data-act="prepSet" data-arg="contract" aria-pressed="${P.contractOn}"><div class="file-no">Encargo ${esc(deCapo(P.contract.capo))}</div><b>${esc(P.contract.n)}</b><span>${esc(contractText(P))}</span><span class="chips"><span class="chip gain">${I.cash}+${money(cr.cash * 0.25)}</span><span class="chip gain">${I.gift}+${25 * cr.lvl} exp.</span><span class="chip risk r1">${I.warn}Si fallas, puede sapearte</span></span><span class="pc-on">${P.contractOn ? '✓ Aceptado' : 'Tocar para aceptar'}</span></button>` : ''}
  </div>
  <h2 class="pick">Equipo</h2>
  ${crewHtml}
  <h2 class="pick">Preparativos</h2>
  <div class="g-list">${prepHtml}</div>
  <h2 class="pick">Herramientas</h2>
  <div class="g-list">${toolHtml}</div>
  <h2 class="pick">Escape del lugar</h2>
  <div class="g-list">${vehHtml}</div>
  <div class="plan-sum">
    <div class="odds"><div class="ob"><i class="a" style="width:${sus}%"></i></div><div class="ol"><span>Sospecha de McCuack ${sus}%</span><span class="${mc > 0.25 ? 'a' : mc > 0 ? 'w' : 'c'}">${mc > 0 ? `Puede aparecer: ${pc(Math.min(1, mc))}` : 'No sospecha nada'}</span></div></div>
    <div class="ps-facts"><span>${I.cash}Preparativos <b>${money(cost + (P.sunk || 0))}</b></span><span>${I.coins}El equipo se lleva <b>${pc(cut)}</b> del botín</span></div>
    <div class="act-row"><button type="button" class="btn ghost" data-act="crimes">Otro golpe</button><button type="button" class="btn big" data-act="prepGo">Ir al lugar</button></div>
  </div>`, 'plan prep');
  ov().scrollTop = y;
}

// Antes de entrar: si McCuack sospecha, puede aparecer de civil
export function prepGo() {
  if (!P) return;
  if (R() < mccChance(P)) {
    sfx('radio');
    ov().innerHTML = modal('McCuack de civil', `
    <div class="ev-head"><img class="det-face" src="${detFace('pensativo')}" alt="" width="64" height="64"><div><div class="file-no">${esc(CITY[P.city].n)}</div><h1 class="ev-title">McCuack anda de civil</h1></div></div>
    <p class="lead">Tanto preparativo llamó la atención: el detective McCuack se pasea por el barrio con un diario bajo el brazo, haciendo preguntas.</p>
    <div class="g-list">
      <button type="button" class="decision" data-act="mccSwap"><span class="d-ico">${I.route}</span><span class="d-body"><span class="d-title">Cambiar de ciudad</span><span class="d-desc">Pierdes lo que pagaste en preparativos y partes de nuevo en otra ciudad.</span></span></button>
      <button type="button" class="decision primary" data-act="mccStay"><span class="d-ico">${I.warn}</span><span class="d-body"><span class="d-title">Dar el golpe igual</span><span class="d-desc">McCuack va a caminar alrededor de la cuadra. Si te ve con el botín, suena la alarma.</span></span></button>
    </div>`, 'event');
    return;
  }
  goBoard(false);
}
export function mccSwap() {
  const sunk = (P.sunk || 0) + PREP.filter((p) => P.prep.has(p.id)).reduce((a, p) => a + prepItemCost(P, p), 0);
  const keep = { crew: P.crew, tools: P.tools, vehicle: P.vehicle, planB: P.planB };
  P = newPrep(P.id);
  Object.assign(P, keep, { sunk });
  for (const r of Object.keys(P.crew)) if (P.crew[r] && !P.offer[r].includes(P.crew[r])) P.offer[r].push(P.crew[r]);
  showPrep();
}
export function mccStay() { goBoard(true); }
function goBoard(mcc) {
  closeOv();
  openBoard(P, startBoard(P, mcc), onBoardEnd);
}

// ---------- Resultado del golpe ----------
const OUT = {
  clean: { stamp: 'Limpio', cls: 'ok', mood: 'burlo', t: 'Entraste, sacaste el botín y saliste sin que nadie se diera cuenta.' },
  witness: { stamp: 'Con testigos', cls: 'warn', mood: 'sorprendido', t: 'Saliste, pero alguien te vio la cara.' },
  alarm: { stamp: '¡Alarma!', cls: 'bad', mood: 'enojado', t: 'La alarma sonó. Saliste con la policía encima.' },
};

function onBoardEnd(H) {
  const o = H.over;
  if (o.abort) { P = null; showCrimes(); return; }
  if (o.caught) {
    afterHeist({ crewIds: [], fallen: [], city: P.city });
    const res = recordRun({ crimeId: P.id, lvl: P.cr.lvl, days: 0, win: false, clean: false, pts: 0 });
    sfx('lose');
    ov().hidden = false;
    ov().innerHTML = modal('Detenido en el golpe', `
    <div class="stamp big caught" aria-hidden="true"><span>Detenido</span></div>
    <div class="file-no">${esc(CITY[P.city].n)} · ${esc(P.cr.n)}</div>
    <div class="end-head"><img class="end-face" src="${face('triste')}" alt="" width="96" height="96"><div><h1>Detenido</h1><p class="hero-quip">«${esc(quip('triste'))}»</p></div></div>
    <p class="lead">${esc(o.msg)} Ni alcanzaste a empezar la fuga.</p>
    ${xpBlock(res)}
    <div class="act-row"><button class="btn big" type="button" data-act="crimes">Otro golpe</button></div>`, 'end lose');
    P = null;
    return;
  }
  const su = toSetup(P, H);
  su.cr.cash = Math.max(80000, su.cr.cash - (P.sunk || 0));
  afterHeist({ crewIds: su.crewIds, fallen: su.fallen, city: P.city });
  done = { id: P.id, setup: su };
  const k = OUT[su.outcome], s = su.summary;
  sfx('stamp');
  if (su.outcome === 'alarm') setTimeout(() => sfx('siren'), 350);
  const lines = [
    `Botín: ${H.carried.map((i) => esc(i.n)).join(', ')}.`,
    `Sales con <b>${money(su.cr.cash)}</b> en efectivo${su.cr.kind === 'goods' ? ` y ${esc(su.cr.goods)} por ${money(su.cr.lootVal)}` : ''}, después de pagar preparativos y la parte del equipo.`,
    su.outcome === 'alarm' ? 'La alarma ya sonó: la PDI viene en camino.' : `La alarma suena en <b>${hrs(su.cr.alarm)}</b>.`,
  ];
  if (s.recorded) lines.push('Una cámara te grabó: tu cara va a salir en las noticias.');
  if (s.mccSaw) lines.push('McCuack te vio en el barrio.');
  if (su.cur !== su.start) lines.push(su.hours <= su.cr.alarm
    ? `Antes de la alarma ya estás en <b>${esc(CITY[su.cur].n)}</b>.`
    : `Vas camino a <b>${esc(CITY[su.cur].n)}</b> (llegas en ${Math.round(su.hours)} h).`);
  if (su.soplonUntil > 0) lines.push('Tu campana te avisará por 12 h qué sabe la PDI.');
  if (su.contract) lines.push(su.contract.ok ? `Encargo ${esc(deCapo(su.contract.capo))}: <b>cumplido</b>.` : `Encargo ${esc(deCapo(su.contract.capo))}: <b>fallido</b>. Va a estar molesto.`);
  ov().hidden = false;
  ov().innerHTML = modal('Resultado del golpe', `
  <div class="stamp big heist ${k.cls}" aria-hidden="true"><span>${esc(k.stamp)}</span></div>
  <div class="file-no">${esc(CITY[su.start].n)} · ${esc(su.cr.n)} · ${s.turns} turnos</div>
  <div class="end-head"><img class="end-face" src="${face(k.mood)}" alt="" width="96" height="96"><div><h1>${esc(k.stamp)}</h1><p class="hero-quip">${esc(k.t)}</p></div></div>
  ${su.notes.map((n) => `<p class="hint">${esc(n)}</p>`).join('')}
  <ul class="heist-lines">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
  <div class="act-row"><button class="btn big" type="button" data-act="heistGo">A huir</button></div>`, `heist ${k.cls}`);
  P = null;
}

// Entrega el golpe dado para empezar la fuga
export function takeHeist() { const d = done; done = null; return d; }

// ---------- Prontuario: rangos y habilidades ----------
export function showCareer() {
  const c = career();
  const r = rankOf(c.xp);
  ov().hidden = false;
  ov().innerHTML = modal('Prontuario', `
  <div class="file-no">Prontuario · Uso exclusivo del hampa</div>
  <h1>${esc(rankName(r))}</h1>
  ${careerCard(c)}
  <div class="ranks">${RANKS.map((k, i) => `<span class="${i <= r ? 'on' : ''}"><b>${esc(k.n)}</b><small>${k.xp}</small></span>`).join('')}</div>
  <h2 class="pick">Habilidades</h2>
  <p class="lead">${c.sp > 0 ? `Tienes <b>${c.sp} ${c.sp === 1 ? 'punto' : 'puntos'}</b> para mejorar.` : 'Ganas un punto cada vez que subes de rango y cada vez que escapas.'}</p>
  <div class="g-list">${Object.entries(SKILLS).map(([k, s]) => {
    const lv = c.skills[k];
    const can = c.sp > 0 && lv < MAX_SKILL_LVL;
    return `<div class="skill"><span class="d-ico">${I[s.icon] || ''}</span><span class="d-body"><span class="d-title">${esc(s.n)} <span class="pips">${'<i class="on"></i>'.repeat(lv)}${'<i></i>'.repeat(MAX_SKILL_LVL - lv)}</span></span><span class="d-desc">${esc(s.d)}</span></span>
      <button type="button" class="btn${can ? '' : ' ghost'}" data-act="skillUp" data-arg="${k}"${can ? '' : ' disabled'} aria-label="Mejorar ${esc(s.n)}">${lv >= MAX_SKILL_LVL ? 'Máx.' : '+1'}</button></div>`;
  }).join('')}</div>
  <div class="act-row"><button class="btn" type="button" data-act="crimes">Ver golpes</button>${S && !S.over ? '<button class="btn ghost" type="button" data-act="closeOv">Volver a la fuga</button>' : ''}</div>`, 'career-m');
}
export function skillUp(k) { if (buySkill(k)) sfx('cash'); showCareer(); }

// Bloque de experiencia para la pantalla final
export function xpBlock(res) {
  if (!res) return '';
  const c = career();
  return `<section class="xp-gain">
    <div class="file-no">Experiencia ganada</div>
    <ul>${res.parts.map(([n, v]) => `<li><span>${esc(n)}</span><b>+${v}</b></li>`).join('')}<li class="tot"><span>Total</span><b>+${res.gain}</b></li></ul>
    ${res.after > res.before ? `<p class="rank-up">${I.gift}¡Subiste a <b>${esc(rankName(res.after))}</b>!${res.newCrimes.length ? ` Nuevos golpes: ${res.newCrimes.map(esc).join(', ')}.` : ''}</p>` : ''}
    ${careerCard(c)}
  </section>`;
}
