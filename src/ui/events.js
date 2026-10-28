// Un solo manejador de clics para toda la página.
// Cada botón declara data-act="<acción>" y, si hace falta, data-arg="<argumento>".
import { $ } from '../lib/util.js';
import { S } from '../game/state.js';
import { rest, lowProfile, disguise, soplon, travel } from '../game/actions.js';
import { askAround, forgeCheap, forgeTop, sellFence, hireExit, leave } from '../game/plan.js';
import { resolveEvent, closeEvent } from '../game/events.js';
import { after } from '../game/engine.js';
import { sellLot, sellItem, acceptJob, robbery, borrow, repay } from '../game/money.js';
import { finish } from '../game/engine.js';
import { render, toast, ui } from './render.js';
import { destList } from './sheets.js';
import { showCrimes, startGame, closeOv, begin } from './screens.js';
import { startPlan, planPick, planStep, planGo, showCareer, skillUp } from './heistui.js';
import { zoomMe, zoomWorld, zoomBy } from './map.js';
import { playTravel, hideStamp } from './fx.js';
import { I } from './icons.js';
import { startTutorial, tutNext, endTutorial, wantTutorial } from './tutorial.js';
import { playFromTitle, skipTitleIntro } from './title.js';
import { dismissDigest, renderDigest } from './digest.js';
import { unlock, sfx, cycleSound, soundMode } from '../audio/sound.js';

// Sonido de cada botón (el viaje, los sellos y los eventos suenan por su cuenta)
const SOUND_OF = {
  sheet: (a) => (S && S.tab === a ? 'close' : 'open'), closeSheet: 'close', closeOv: 'close', digestOk: 'close',
  rest: 'rest', lowProfile: 'rest', disguise: 'swish', soplon: 'ask', ask: 'ask',
  forgeCheap: 'paper', forgeTop: 'paper', start: 'paper', crimes: 'paper', planPick: 'tap', planStep: 'paper', planGo: null, heistGo: 'siren', careerOpen: 'paper', skillUp: null, begin: 'tap',
  sellFence: 'cash', sellLot: 'cash', sellItem: 'cash', acceptJob: 'cash', robbery: 'cash', borrow: 'cash', repay: 'cash', hire: 'cash',
  leave: (k) => (k === 'captain' ? 'ship' : 'air'), eventChoice: 'resolve', surrender: 'deny',
  travel: null, sound: null, titleSkip: null,
};
const SND_LABEL = { all: 'Música y sonidos', sfx: 'Solo sonidos (sin música)', off: 'Silencio' };
export function sndButton() {
  const m = soundMode();
  document.querySelectorAll('[data-act="sound"]').forEach((b) => { b.innerHTML = m === 'all' ? I.music : m === 'sfx' ? I.sound : I.mute; b.setAttribute('aria-label', `Sonido: ${SND_LABEL[m]}. Tocar para cambiar`); b.title = SND_LABEL[m]; });
}

let surrenderArmed = false;

const ACTIONS = {
  // Pantallas
  crimes: () => showCrimes(),
  start: (id) => startPlan(id),
  planPick: (a) => planPick(a),
  planStep: (d) => planStep(d),
  planGo: () => planGo(),
  heistGo: () => startGame(),
  careerOpen: () => showCareer(),
  skillUp: (k) => skillUp(k),
  begin: () => begin(),
  closeOv: () => closeOv(),
  viewMap: () => { closeOv(); if (S) { S.tab = 'act'; render(); } zoomMe(); },
  zoomMe: () => zoomMe(),
  zoomWorld: () => zoomWorld(),
  zoomIn: () => zoomBy(0.55),
  zoomOut: () => zoomBy(1.8),
  sound: () => { const m = cycleSound(); sndButton(); sfx('tap'); toast(SND_LABEL[m]); },
  digestOk: () => { dismissDigest(); render(); },
  toggleStats: () => { ui.statsOpen = !ui.statsOpen; render(); },
  // Pantalla de inicio
  titlePlay: () => playFromTitle(),
  titleSkip: () => skipTitleIntro(),
  titleTutorial: () => { wantTutorial(); playFromTitle(); toast('Elige un golpe: el tutorial te guía en tu primera fuga.'); },
  // Tutorial
  tutorial: () => { if (S && !S.over) startTutorial(); else showCrimes(); },
  tutNext: () => tutNext(),
  tutSkip: () => endTutorial(),
  // Hojas de acciones: tocar la abierta la cierra
  sheet: (id) => { S.tab = S.tab === id ? 'act' : id; render(); if (id === 'move') zoomMe(); },
  closeSheet: () => { S.tab = 'act'; render(); },
  filter: (k) => { ui.filter = k; ui.q = ''; render(); },
  dest: (id) => { S.dest = id || ''; render(); zoomMe(); },
  // Esconderse y bajo mundo
  rest: (kind) => rest(kind),
  lowProfile: () => lowProfile(),
  disguise: () => disguise(),
  soplon: () => soplon(),
  // Plan de escape
  ask: (k) => askAround(k),
  forgeCheap: () => forgeCheap(),
  forgeTop: () => forgeTop(),
  sellFence: () => sellFence(),
  hire: (k) => hireExit(k),
  leave: (k) => leave(k),
  goto: (id) => { S.dest = id; S.tab = 'move'; render(); zoomMe(); },
  // Eventos
  eventChoice: (i) => { resolveEvent(Number(i)); if (S.over) return; render(); },
  eventClose: () => { closeEvent(); closeOv(); after(); },
  // Dinero
  sellLot: () => sellLot(),
  sellItem: (i) => sellItem(Number(i)),
  acceptJob: () => acceptJob(),
  robbery: (kind) => robbery(kind),
  borrow: () => borrow(),
  repay: () => repay(),
  // Viajar: arg = "ciudad|medio"
  travel: async (arg) => { const [to, k] = arg.split('|'); await playTravel(to, k); travel(to, k); },
  surrender: () => {
    if (!surrenderArmed) {
      surrenderArmed = true;
      toast('Toca otra vez «Entregarse» para confirmar.');
      setTimeout(() => { surrenderArmed = false; }, 4000);
      return;
    }
    surrenderArmed = false;
    finish(false, 'Te entregaste en la comisaría más cercana.');
  },
};

export function initEvents() {
  // Iconos fijos del HTML
  document.querySelectorAll('[data-ico]').forEach((el) => { el.outerHTML = I[el.dataset.ico]; });

  // El navegador solo deja sonar audio después de un toque
  for (const ev of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, unlock, { passive: true });
  sndButton();

  document.addEventListener('click', (e) => {
    if (e.target.closest('#stampLayer')) { hideStamp(); return; }
    // Tocar fuera del parte lo da por leído; la próxima acción trae su propio parte
    const dg = $('#digest');
    let read = false;
    if (!dg.hidden && !e.target.closest('#digest, #ov, #tut, #fx')) { dismissDigest(); read = true; }
    else if (!dg.hidden && e.target.closest('#digest') && !e.target.closest('[data-act]')) { dismissDigest(); renderDigest(); return; }
    // Tocar la escena de inicio la salta (salvo los botones)
    if (e.target.closest('#title') && !e.target.closest('[data-act]')) { skipTitleIntro(); return; }
    const el = e.target.closest('[data-act]');
    if (el && el.disabled) sfx('deny');
    if (el && !el.disabled) {
      const snd = el.dataset.act in SOUND_OF ? SOUND_OF[el.dataset.act] : 'tap';
      const name = typeof snd === 'function' ? snd(el.dataset.arg) : snd;
      if (name) sfx(name);
      const fn = ACTIONS[el.dataset.act];
      if (fn) fn(el.dataset.arg);
      if (read) renderDigest();
      return;
    }
    // Tocar una ciudad en el mapa la elige como destino y abre "Moverse"
    const city = e.target.closest('#map g[data-id]');
    if (city && S && !S.over) {
      S.dest = city.dataset.id === S.cur ? '' : city.dataset.id;
      S.tab = 'move';
      render();
    } else if (read) renderDigest();
  });

  // Buscador de destinos: solo redibuja la lista para no perder el foco
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'q') return;
    ui.q = e.target.value;
    $('#destList').innerHTML = destList();
    document.querySelectorAll('.filter').forEach((b) => b.setAttribute('aria-pressed', !ui.q && b.dataset.arg === ui.filter));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#stampLayer').hidden) hideStamp();
    else if (!$('#digest').hidden) { dismissDigest(); render(); }
    else if (S && S.tab !== 'act' && $('#ov').hidden) { S.tab = 'act'; render(); }
  });

  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => S && render(), 200); });
}
