// Punto de entrada de Pato Malo.
import './styles.css';
import { initMap, zoomStart } from './ui/map.js';
import { initEvents } from './ui/events.js';
import { render } from './ui/render.js';
import { showCrimes } from './ui/screens.js';
import { face } from './ui/pato.js';
import { showTitle } from './ui/title.js';

document.getElementById('brandFace').src = face('normal');

initMap();
initEvents();
render();
zoomStart();
// Pantalla de inicio; al tocar Jugar se abre la elección del golpe
showTitle(showCrimes);

// Solo en desarrollo: acceso al estado para pruebas automáticas
if (import.meta.env.DEV) {
  Promise.all([import('./game/state.js'), import('./game/events.js'), import('./ui/render.js')]).then(([st, ev, ui]) => {
    window.__dev = {
      S: () => st.S,
      // Fuerza un evento por id para revisarlo en pantalla
      event: (id) => { const e = ev.EVENTS.find((x) => x.id === id); st.S.event = { id, ctx: { kind: 'city' }, vals: e.vals ? e.vals({ kind: 'city' }) : {}, result: null }; st.S.evCount++; ui.render(); },
    };
  });
}
