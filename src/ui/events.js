// Un solo manejador de clics para toda la página.
// Cada botón declara data-act="<acción>" y, si hace falta, data-arg="<argumento>".
import { $ } from '../lib/util.js';
import { S } from '../game/state.js';
import { rest, lowProfile, disguise, soplon, forge, searchFence, sell, travel } from '../game/actions.js';
import { sellLot, sellItem, acceptJob, robbery, borrow, repay } from '../game/money.js';
import { finish } from '../game/engine.js';
import { render, toast } from './render.js';
import { showCrimes, startGame, closeOv, begin } from './screens.js';
import { zoomMe, zoomWorld } from './map.js';

let surrenderArmed = false;

const ACTIONS = {
  // Pantallas
  crimes: () => showCrimes(),
  start: (id) => startGame(id),
  begin: () => begin(),
  closeOv: () => closeOv(),
  viewMap: () => { closeOv(); zoomMe(); },
  tab: (k) => { S.tab = k; render(); },
  zoomMe: () => zoomMe(),
  zoomWorld: () => zoomWorld(),
  // Esconderse y bajo mundo
  rest: (kind) => rest(kind),
  lowProfile: () => lowProfile(),
  disguise: () => disguise(),
  soplon: () => soplon(),
  forge: () => forge(),
  searchFence: () => searchFence(),
  sell: () => sell(),
  // Dinero
  sellLot: () => sellLot(),
  sellItem: (i) => sellItem(Number(i)),
  acceptJob: () => acceptJob(),
  robbery: (kind) => robbery(kind),
  borrow: () => borrow(),
  repay: () => repay(),
  // Viajar: arg = "ciudad|medio"
  travel: (arg) => { const [to, k] = arg.split('|'); travel(to, k); },
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
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (el && !el.disabled) {
      const fn = ACTIONS[el.dataset.act];
      if (fn) fn(el.dataset.arg);
      return;
    }
    // Tocar una ciudad en el mapa la elige como destino
    const city = e.target.closest('#map g[data-id]');
    if (city && S && !S.over) {
      S.dest = city.dataset.id === S.cur ? '' : city.dataset.id;
      S.tab = 'via';
      render();
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'dest') { S.dest = e.target.value; render(); zoomMe(); }
  });
  $('#zMe').dataset.act = 'zoomMe';
  $('#zWorld').dataset.act = 'zoomWorld';
}
