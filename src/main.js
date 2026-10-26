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
