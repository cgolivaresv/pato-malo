// Pantallas de la carrera criminal: escalera de golpes, planificación, resultado del golpe y prontuario.
import { CRIMES, PLAN, RANKS, SKILLS } from '../data/content.js';
import { CITY } from '../data/geo.js';
import { $, esc, money } from '../lib/util.js';
import { S } from '../game/state.js';
import { career, rankOf, rankName, nextRank, unlocked, buySkill, MAX_SKILL_LVL } from '../game/career.js';
import { defaultPlan, odds, budget, alarmHours, optCost, execute, has, SAPO } from '../game/heist.js';
import { I } from './icons.js';
import { PATO, face } from './pato.js';
import { MCCUACK, DET_NAME, MOTTO, detFace } from './detective.js';
import { sfx } from '../audio/sound.js';

const ov = () => $('#ov');
const modal = (label, inner, cls = '') => `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${label}"><div class="tape" aria-hidden="true"></div><div class="in">${inner}</div></div>`;
const STARS = (n) => `<span class="lvl" aria-label="Dificultad ${n} de 5">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5 - n)}</span>`;
const pc = (x) => `${Math.round(x * 100)}%`;
const hrs = (h) => `${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')} ${h === 1 ? 'hora' : 'horas'}`;
const ipTxt = (h) => (isFinite(h) ? `Interpol ${h} h` : 'Sin Interpol');

// Plan en curso (todavía no se da el golpe) y golpe ya dado esperando la fuga
let draft = null;
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
  draft = null;
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
  <p class="lead">Elige un golpe, planéalo y después huye. Los golpes grandes se desbloquean a medida que Pato Malo gana experiencia.</p>
  <div class="rival"><img src="${MCCUACK}" alt="${DET_NAME}, con sombrero fedora, lentes oscuros y gabardina" width="90" height="149"><div><div class="file-no">Te persigue</div><b>${DET_NAME}</b><p>Jefe de la Brigada de Robos. Nunca duerme y nunca olvida una pista.</p><p class="rival-motto">«${MOTTO}»</p></div></div>
  <details class="rules"><summary>Cómo se juega</summary><ul>
    <li><b>Planea el golpe.</b> Reconocimiento, equipo, horario, herramientas y cómo te vas. Cada decisión cambia la probabilidad de que salga limpio y cómo empieza la fuga.</li>
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

// ---------- Planificación ----------
export function startPlan(id) {
  const cr = CRIMES.find((c) => c.id === id);
  if (!cr || !unlocked(cr)) return;
  draft = { id, step: 0, plan: defaultPlan() };
  showPlan();
}

export function planPick(arg) {
  if (!draft) return;
  const [sid, oid] = arg.split('|');
  const st = PLAN.find((p) => p.id === sid);
  if (st.multi) {
    const v = draft.plan[sid];
    draft.plan[sid] = v.includes(oid) ? v.filter((x) => x !== oid) : [...v, oid];
  } else draft.plan[sid] = oid;
  // Sin chofer no hay auto
  if (!draft.plan.crew.includes('chofer') && draft.plan.salida === 'auto') draft.plan.salida = 'pie';
  showPlan(true);
}
export function planStep(d) {
  if (!draft) return;
  const n = draft.step + Number(d);
  if (n < 0) { showCrimes(); return; }
  draft.step = Math.min(PLAN.length - 1, n);
  showPlan();
}

function optChips(cr, o) {
  const out = [];
  const cost = optCost(cr, o);
  if (cost) out.push(`<span class="chip">${I.cash}${money(cost)}</span>`);
  if (o.cut) out.push(`<span class="chip">${I.coins}Se lleva ${pc(o.cut)}</span>`);
  if (o.loot && o.loot !== 1) out.push(`<span class="chip ${o.loot > 1 ? 'gain' : ''}">${I.cash}Botín ${o.loot > 1 ? '+' : '−'}${pc(Math.abs(o.loot - 1))}</span>`);
  if (o.clean) out.push(`<span class="chip risk ${o.clean > 0 ? 'r0' : 'r2'}">${I.shield}${o.clean > 0 ? '+' : '−'}${pc(Math.abs(o.clean))} limpio</span>`);
  return out.length ? `<span class="chips">${out.join('')}</span>` : '';
}

function oddsBar(o) {
  return `<div class="odds" aria-label="Golpe limpio ${pc(o.clean)}, con testigos ${pc(o.witness)}, alarma ${pc(o.alarm)}">
    <div class="ob"><i class="c" style="width:${o.clean * 100}%"></i><i class="w" style="width:${o.witness * 100}%"></i><i class="a" style="width:${o.alarm * 100}%"></i></div>
    <div class="ol"><span class="c">Limpio ${pc(o.clean)}</span><span class="w">Testigos ${pc(o.witness)}</span><span class="a">Alarma ${pc(o.alarm)}</span></div>
  </div>`;
}

function showPlan(keepScroll) {
  const { id, step, plan } = draft;
  const cr = CRIMES.find((c) => c.id === id);
  const st = PLAN[step], last = step === PLAN.length - 1;
  const o = odds(cr, plan), b = budget(cr, plan);
  const y = keepScroll ? ov().scrollTop : 0;
  const opts = st.opts.map((op) => {
    const on = has(plan, st.id, op.id);
    const blocked = op.need && !plan.crew.includes(op.need);
    return `<button type="button" class="decision plan-opt${on ? ' on' : ''}" data-act="planPick" data-arg="${st.id}|${op.id}" aria-pressed="${on}"${blocked ? ' disabled' : ''}>
      <span class="d-ico">${st.multi ? `<span class="tick">${on ? '✓' : ''}</span>` : `<span class="radio${on ? ' on' : ''}"></span>`}</span>
      <span class="d-body"><span class="d-title">${esc(op.n)}</span><span class="d-desc">${esc(op.d)}</span>${optChips(cr, op)}${blocked ? '<span class="d-why">Necesitas un chofer en el equipo</span>' : ''}</span>
    </button>`;
  }).join('');
  ov().hidden = false;
  ov().innerHTML = modal('Planificar el golpe', `
  <div class="file-no">Planificación · ${esc(cr.n)}</div>
  <div class="steps" aria-label="Paso ${step + 1} de ${PLAN.length}">${PLAN.map((p, i) => `<span class="${i < step ? 'done' : i === step ? 'cur' : ''}">${esc(p.n)}</span>`).join('')}</div>
  <h1 class="plan-h">${esc(st.n)}</h1>
  <p class="lead">${esc(st.q)}${st.multi ? ' <small class="muted">Puedes elegir varios o ninguno.</small>' : ''}</p>
  <div class="g-list">${opts}</div>
  ${st.id === 'crew' && plan.crew.length ? `<p class="hint">Cada integrante tiene ${pc(SAPO)} de probabilidad de caer y hablar durante la fuga.</p>` : ''}
  <div class="plan-sum">
    ${oddsBar(o)}
    <div class="ps-facts"><span>${I.cash}Sales con <b>${money(Math.max(0, b.cash))}</b></span><span>${I.clock}Alarma en <b>${hrs(alarmHours(cr, plan))}</b> si sale limpio</span></div>
    ${b.ok ? '' : '<p class="d-why">El plan cuesta demasiado: no te quedaría plata para huir.</p>'}
    ${b.ok && !cr.obj.includes('cross') && b.cash < 2200000 ? '<p class="hint">Ojo: para salir del continente vas a necesitar entre $1,2 y $2 millones para pagarle a un contacto (o conseguirlos en la fuga).</p>' : ''}
    <div class="act-row"><button type="button" class="btn ghost" data-act="planStep" data-arg="-1">${step ? 'Atrás' : 'Elegir otro golpe'}</button>${last ? `<button type="button" class="btn big" data-act="planGo"${b.ok ? '' : ' disabled'}>¡Dar el golpe!</button>` : '<button type="button" class="btn" data-act="planStep" data-arg="1">Siguiente</button>'}</div>
  </div>`, 'plan');
  ov().scrollTop = y;
}

// ---------- Resultado del golpe ----------
const OUT = {
  clean: { stamp: 'Limpio', cls: 'ok', mood: 'burlo', t: 'Entraste, sacaste el botín y saliste sin que nadie se diera cuenta.' },
  witness: { stamp: 'Con testigos', cls: 'warn', mood: 'sorprendido', t: 'Salió, pero alguien te vio la cara.' },
  alarm: { stamp: '¡Alarma!', cls: 'bad', mood: 'enojado', t: 'La alarma saltó antes de tiempo. Saliste corriendo con lo que pudiste.' },
};

export function planGo() {
  if (!draft) return;
  const cr = CRIMES.find((c) => c.id === draft.id);
  if (!budget(cr, draft.plan).ok) return;
  done = { id: draft.id, setup: execute(draft.id, draft.plan) };
  draft = null;
  const su = done.setup, k = OUT[su.outcome];
  sfx('stamp');
  if (su.outcome === 'alarm') setTimeout(() => sfx('siren'), 350);
  const lines = [
    `Sales con <b>${money(su.cr.cash)}</b> en efectivo${su.cr.lootVal ? ` y ${esc(su.cr.loot.replace(/por \$\d+ millones/, '').trim())} por ${money(su.cr.lootVal)}` : ''}.`,
    `La alarma suena en <b>${hrs(su.cr.alarm)}</b>.`,
  ];
  if (su.cur !== su.start) lines.push(su.hours <= su.cr.alarm
    ? `Antes de la alarma ya estás en <b>${esc(CITY[su.cur].n)}</b>, a ${Math.round(su.hours)} h de ${esc(CITY[su.start].n)}.`
    : `Cuando suene la alarma vas a ir camino a <b>${esc(CITY[su.cur].n)}</b> (llegas en ${Math.round(su.hours)} h).`);
  if (su.disguiseUntil > 0) lines.push('Sales disfrazado de repartidor.');
  if (su.soplonUntil > 0) lines.push('Tu campana te avisará por 12 h qué sabe la PDI.');
  ov().hidden = false;
  ov().innerHTML = modal('Resultado del golpe', `
  <div class="stamp big heist ${k.cls}" aria-hidden="true"><span>${esc(k.stamp)}</span></div>
  <div class="file-no">${esc(CITY[su.start].n)} · ${esc(su.cr.n)}</div>
  <div class="end-head"><img class="end-face" src="${face(k.mood)}" alt="" width="96" height="96"><div><h1>${esc(k.stamp)}</h1><p class="hero-quip">${esc(k.t)}</p></div></div>
  ${su.notes.map((n) => `<p class="hint">${esc(n)}</p>`).join('')}
  <ul class="heist-lines">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
  <p class="muted small">Probabilidades que tenías: limpio ${pc(su.odds.clean)} · testigos ${pc(su.odds.witness)} · alarma ${pc(su.odds.alarm)}</p>
  <div class="act-row"><button class="btn big" type="button" data-act="heistGo">A huir</button></div>`, `heist ${k.cls}`);
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
