// Punto de entrada de Pato Malo.
import './styles.css';
import { initMap, zoomStart } from './ui/map.js';
import { initEvents } from './ui/events.js';
import { render } from './ui/render.js';
import { showCrimes } from './ui/screens.js';

initMap();
initEvents();
render();
zoomStart();
showCrimes();
