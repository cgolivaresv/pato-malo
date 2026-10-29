// Música y efectos de sonido, generados en el navegador con Web Audio (sin archivos de audio).
// La música es un tema de misterio policial en Re menor: tic-tac de reloj, bajo que desciende
// de a medio tono, acordes sostenidos y un vibráfono con eco. Tiene tres niveles de tensión que cambian con el peligro de la fuga.
// El navegador solo deja sonar audio después de un toque del jugador, por eso todo arranca con unlock().
import { store } from '../lib/util.js';

const KEY = 'pato-sonido';
// mode: 'all' (música y efectos) · 'sfx' (solo efectos) · 'off' (silencio)
let mode = (store(KEY) || {}).mode || 'all';
let ctx = null, master, musicBus, sfxBus, delay, noiseBuf;

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = mode === 'all' ? 0.65 : 0; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = mode === 'off' ? 0 : 0.55; sfxBus.connect(master);
  // Eco tipo guitarra de película policial
  delay = ctx.createDelay(1);
  delay.delayTime.value = 0.36;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const wet = ctx.createGain(); wet.gain.value = 0.35;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(musicBus);
  // Ruido blanco para platillos, tambores y viento
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (mode !== 'off') ctx.resume();
  });
  return true;
}

// Se llama en cada toque: el primero habilita el audio
export function unlock() {
  if (mode === 'off' && !ctx) return;
  if (!init()) return;
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  if (wantMusic && mode === 'all' && !playing) startMusic();
}

export const soundMode = () => mode;
export function cycleSound() {
  mode = mode === 'all' ? 'sfx' : mode === 'sfx' ? 'off' : 'all';
  store(KEY, { mode });
  if (init()) {
    const t = ctx.currentTime;
    musicBus.gain.setTargetAtTime(mode === 'all' ? 0.65 : 0, t, 0.15);
    sfxBus.gain.setTargetAtTime(mode === 'off' ? 0 : 0.55, t, 0.05);
    if (mode !== 'off' && ctx.state === 'suspended') ctx.resume();
    if (mode === 'all' && wantMusic && !playing) startMusic();
    if (mode !== 'all') stopMusic();
  }
  return mode;
}

// ---------- Piezas básicas ----------
function env(g, t, a, peak, dec, sustain = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + dec);
}
function tone(bus, { type = 'sine', f, f2, t, a = 0.005, dec = 0.2, vol = 0.3, lp, q = 0.7, detune = 0, send = 0 }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + dec);
  let node = o;
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.Q.value = q; node.connect(fl); node = fl; }
  node.connect(g); g.connect(bus);
  if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s).connect(delay); }
  env(g, t, a, vol, dec);
  o.start(t); o.stop(t + a + dec + 0.05);
  return o;
}
function noise(bus, { t, type = 'highpass', f = 7000, f2, q = 0.8, a = 0.002, dec = 0.05, vol = 0.2 }) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + dec);
  s.connect(fl).connect(g).connect(bus);
  env(g, t, a, vol, dec);
  s.start(t, Math.random() * 0.5); s.stop(t + a + dec + 0.05);
}

// ---------- Música ----------
// Misterio policial en Re menor, sin swing. 8 compases de 8 corcheas.
// El bajo baja de a medio tono (Re, Do#, Do, Si, Sib, La) bajo un acorde de Re menor que cambia
// de color; arriba, un vibráfono con eco deja pistas sueltas y un reloj marca el tic-tac.
const ROOT = [38, 37, 36, 35, 34, 34, 33, 33];
const CHORDS = [[50, 53, 57], [49, 53, 57], [48, 53, 57], [47, 53, 57], [46, 50, 53, 57], [46, 50, 53, 57], [45, 49, 52, 55, 58], [45, 49, 52, 55]];
const VIBE = [
  [69, null, null, null, 77, null, 76, null],
  [null, null, 73, null, null, null, null, null],
  [72, null, null, 74, null, 72, null, 69],
  [71, null, null, null, null, null, null, null],
  [70, null, 74, null, 77, null, 81, null],
  [79, null, null, 77, null, null, null, null],
  [76, null, null, null, 73, null, 70, null],
  [69, null, null, null, null, null, null, null],
];
// Respuesta grave (violonchelo) en la segunda vuelta
const CELLO = [
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, 57, null, 56, null],
  [null, null, null, null, 55, null, 53, null],
  [null, null, null, null, 52, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, 53, null, 55, null],
  [null, null, null, null, 57, null, 58, null],
  [57, null, null, null, null, null, null, null],
];
const TEMPO = [84, 94, 112];

let playing = false, wantMusic = false, level = 0, nextLevel = 0;
let timer = 0, step = 0, bar = 0, cycle = 0, nextT = 0, tempo = TEMPO[0];

function startMusic() {
  if (!ctx || playing) return;
  playing = true;
  step = 0; bar = 0; cycle = 0; tempo = TEMPO[nextLevel]; level = nextLevel;
  nextT = ctx.currentTime + 0.08;
  timer = setInterval(schedule, 25);
}
function stopMusic() {
  playing = false;
  clearInterval(timer);
}
export function music(on) {
  wantMusic = on;
  if (!on) stopMusic();
  else if (ctx && mode === 'all' && ctx.state === 'running') startMusic();
}
// 0 tranquilo · 1 tensión · 2 peligro (la brigada en tu ciudad)
export function musicLevel(l) { nextLevel = Math.max(0, Math.min(2, l)); }

function schedule() {
  while (nextT < ctx.currentTime + 0.15) {
    playStep(step, bar, nextT);
    nextT += 30 / tempo; // corchea
    step++;
    if (step === 8) {
      step = 0; bar++;
      if (bar === 8) { bar = 0; cycle++; }
      if (bar % 2 === 0) { level = nextLevel; tempo = TEMPO[level]; }
    }
  }
}

// Vibráfono: dos senos (fundamental y brillo) con trémolo y eco
function vibe(n, t, vol) {
  const g = ctx.createGain(), trem = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  for (const [mul, v] of [[1, 1], [4, 0.18], [10.1, 0.05]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.value = midi(n) * mul; og.gain.value = v;
    o.connect(og).connect(g); o.start(t); o.stop(t + 2.2);
  }
  lfo.frequency.value = 5.2; lg.gain.value = 0.25; trem.gain.value = 0.75;
  lfo.connect(lg).connect(trem.gain); lfo.start(t); lfo.stop(t + 2.2);
  g.connect(trem).connect(musicBus);
  const s = ctx.createGain(); s.gain.value = 0.7; trem.connect(s).connect(delay);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
}

function playStep(s, b, t) {
  const hot = level === 2;
  const second = cycle % 2 === 1;
  // Tic-tac de reloj en cada negra
  if (s % 2 === 0) noise(musicBus, { t, type: 'bandpass', f: s % 4 === 0 ? 3200 : 2500, q: 6, dec: 0.025, vol: 0.12 });
  // Bajo pulsado: negras en calma, corcheas con tensión, saltos de octava en peligro
  if (level >= 1 || s % 2 === 0) {
    const n = ROOT[b] + (hot && s % 2 ? 12 : 0);
    tone(musicBus, { type: 'triangle', f: midi(n), t, a: 0.005, dec: 0.22, vol: s === 0 ? 0.5 : 0.36, lp: 500 });
  }
  // Acorde sostenido al empezar cada compás
  if (s === 0) {
    for (const n of CHORDS[b]) {
      for (const dt of [-7, 7]) tone(musicBus, { type: 'sawtooth', f: midi(n), t, a: 0.6, dec: 2.6, vol: 0.016, lp: hot ? 1000 : 650, detune: dt });
    }
  }
  // Timbal grave al comienzo de cada par de compases (tensión)
  if (level >= 1 && s === 0 && b % 2 === 0) tone(musicBus, { f: midi(ROOT[b]) * 2, f2: midi(ROOT[b]) * 1.8, t, a: 0.01, dec: 0.9, vol: 0.35 });
  // Latido en peligro
  if (hot && (s === 0 || s === 1 || s === 4 || s === 5)) tone(musicBus, { f: 70, f2: 40, t: t + (s % 2 ? 0.02 : 0), a: 0.003, dec: 0.14, vol: s % 2 ? 0.25 : 0.4 });
  // Vibráfono: en calma solo vueltas alternas; con tensión, siempre
  const v = VIBE[b][s];
  if (v != null && (level >= 1 || second)) vibe(v + (second && level >= 1 ? 12 : 0), t, 0.11);
  // Violonchelo con arco en la segunda vuelta
  const c = CELLO[b][s];
  if (c != null && second) tone(musicBus, { type: 'sawtooth', f: midi(c), t, a: 0.12, dec: 0.9, vol: 0.05, lp: 900, q: 1.5 });
  // Peligro: cuerdas en staccato a contratiempo y sirena lejana
  if (hot && s % 2) for (const n of CHORDS[b].slice(0, 3)) tone(musicBus, { type: 'sawtooth', f: midi(n + 12), t, a: 0.004, dec: 0.1, vol: 0.02, lp: 2200 });
  if (hot && s === 0 && b % 4 === 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = 'triangle'; fl.type = 'lowpass'; fl.frequency.value = 1400;
    for (let i = 0; i < 4; i++) o.frequency.setValueAtTime(i % 2 ? 660 : 880, t + i * 0.45);
    o.connect(fl).connect(g).connect(musicBus);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.start(t); o.stop(t + 1.9);
  }
}

// ---------- Efectos ----------
const SFX = {
  tap: (t) => tone(sfxBus, { f: 1050, f2: 700, t, a: 0.002, dec: 0.05, vol: 0.18 }),
  open: (t) => noise(sfxBus, { t, type: 'bandpass', f: 600, f2: 2400, q: 1.2, a: 0.02, dec: 0.14, vol: 0.12 }),
  close: (t) => noise(sfxBus, { t, type: 'bandpass', f: 2200, f2: 600, q: 1.2, a: 0.02, dec: 0.12, vol: 0.1 }),
  cash: (t) => {
    // Caja registradora: campanita y monedas
    tone(sfxBus, { type: 'square', f: midi(88), t, dec: 0.08, vol: 0.12, lp: 5000 });
    tone(sfxBus, { type: 'square', f: midi(93), t: t + 0.07, dec: 0.3, vol: 0.12, lp: 5000 });
    tone(sfxBus, { f: midi(100), t: t + 0.07, dec: 0.5, vol: 0.12 });
  },
  rest: (t) => [76, 72, 67, 64].forEach((n, i) => tone(sfxBus, { type: 'triangle', f: midi(n), t: t + i * 0.13, dec: 0.4, vol: 0.18 })),
  swish: (t) => { noise(sfxBus, { t, type: 'bandpass', f: 800, f2: 5000, q: 2, a: 0.03, dec: 0.18, vol: 0.18 }); tone(sfxBus, { f: midi(84), t: t + 0.15, dec: 0.3, vol: 0.1 }); },
  ask: (t) => { for (let i = 0; i < 5; i++) tone(sfxBus, { type: 'triangle', f: 180 + Math.random() * 90, t: t + i * 0.07, dec: 0.08, vol: 0.12, lp: 900 }); },
  paper: (t) => { noise(sfxBus, { t, type: 'bandpass', f: 3000, q: 0.6, dec: 0.08, vol: 0.15 }); noise(sfxBus, { t: t + 0.09, type: 'bandpass', f: 2200, q: 0.6, dec: 0.1, vol: 0.12 }); },
  bus: (t) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(48, t); o.frequency.linearRampToValueAtTime(70, t + 0.9);
    fl.type = 'lowpass'; fl.frequency.value = 320;
    lfo.frequency.value = 14; lg.gain.value = 0.08; lfo.connect(lg).connect(g.gain);
    o.connect(fl).connect(g).connect(sfxBus);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.start(t); lfo.start(t); o.stop(t + 1.15); lfo.stop(t + 1.15);
    tone(sfxBus, { type: 'square', f: 392, t: t + 0.05, dec: 0.12, vol: 0.06, lp: 1500 });
    tone(sfxBus, { type: 'square', f: 330, t: t + 0.2, dec: 0.16, vol: 0.06, lp: 1500 });
  },
  train: (t) => {
    // Traqueteo y pito del tren
    for (let i = 0; i < 6; i++) noise(sfxBus, { t: t + i * 0.16, type: 'bandpass', f: i % 2 ? 900 : 600, q: 1.5, dec: 0.07, vol: 0.2 });
    tone(sfxBus, { type: 'triangle', f: midi(81), t: t + 0.1, a: 0.04, dec: 0.5, vol: 0.09 });
    tone(sfxBus, { type: 'triangle', f: midi(84), t: t + 0.1, a: 0.04, dec: 0.5, vol: 0.07 });
  },
  air: (t) => { noise(sfxBus, { t, type: 'bandpass', f: 300, f2: 2500, q: 0.7, a: 0.4, dec: 0.7, vol: 0.22 }); tone(sfxBus, { type: 'sawtooth', f: 90, f2: 240, t, a: 0.3, dec: 0.8, vol: 0.06, lp: 600 }); },
  paso: (t) => { for (let i = 0; i < 6; i++) noise(sfxBus, { t: t + i * 0.16, type: 'lowpass', f: 900, dec: 0.06, vol: 0.25 }); },
  ship: (t) => { tone(sfxBus, { type: 'sawtooth', f: 98, t, a: 0.08, dec: 0.9, vol: 0.14, lp: 500 }); tone(sfxBus, { type: 'sawtooth', f: 147, t, a: 0.08, dec: 0.9, vol: 0.1, lp: 500 }); },
  stamp: (t) => { tone(sfxBus, { f: 140, f2: 40, t, a: 0.002, dec: 0.25, vol: 0.7 }); noise(sfxBus, { t, type: 'lowpass', f: 1800, dec: 0.12, vol: 0.4 }); },
  siren: (t) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = 'square'; fl.type = 'lowpass'; fl.frequency.value = 2200;
    for (let i = 0; i < 4; i++) { o.frequency.setValueAtTime(i % 2 ? 620 : 830, t + i * 0.32); }
    o.connect(fl).connect(g).connect(sfxBus);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.05); g.gain.setValueAtTime(0.12, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
    o.start(t); o.stop(t + 1.4);
  },
  event: (t) => {
    // Golpe de suspenso: acorde disminuido
    [52, 58, 61, 64].forEach((n) => tone(sfxBus, { type: 'sawtooth', f: midi(n), t, a: 0.005, dec: 0.9, vol: 0.06, lp: 1600 }));
    tone(sfxBus, { f: 82, f2: 41, t, dec: 0.5, vol: 0.4 });
  },
  resolve: (t) => [64, 67, 71].forEach((n, i) => tone(sfxBus, { type: 'triangle', f: midi(n), t: t + i * 0.06, dec: 0.3, vol: 0.14 })),
  alert: (t) => { for (let i = 0; i < 2; i++) tone(sfxBus, { type: 'square', f: 880, t: t + i * 0.18, dec: 0.1, vol: 0.09, lp: 2500 }); },
  radio: (t) => { noise(sfxBus, { t, type: 'bandpass', f: 1800, q: 3, dec: 0.12, vol: 0.18 }); tone(sfxBus, { type: 'square', f: 1250, t: t + 0.13, dec: 0.07, vol: 0.06, lp: 3000 }); },
  news: (t) => { tone(sfxBus, { f: midi(79), t, dec: 0.12, vol: 0.1 }); tone(sfxBus, { f: midi(84), t: t + 0.09, dec: 0.2, vol: 0.1 }); },
  deny: (t) => tone(sfxBus, { type: 'square', f: 150, t, dec: 0.15, vol: 0.08, lp: 900 }),
  win: (t) => {
    [64, 67, 71, 74, 76].forEach((n, i) => tone(sfxBus, { type: 'square', f: midi(n), t: t + i * 0.11, dec: 0.25, vol: 0.08, lp: 3000 }));
    [52, 59, 64, 67, 71].forEach((n) => tone(sfxBus, { type: 'sawtooth', f: midi(n), t: t + 0.6, a: 0.02, dec: 1.6, vol: 0.05, lp: 2200 }));
  },
  lose: (t) => {
    // Trombón triste: wa wa wa waaa
    [[58, 0], [57, 0.38], [56, 0.76], [55, 1.14]].forEach(([n, d], i) => {
      const o = tone(sfxBus, { type: 'sawtooth', f: midi(n), t: t + d, a: 0.04, dec: i === 3 ? 1.1 : 0.32, vol: 0.12, lp: 900, q: 3 });
      if (i === 3) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = 25; l.connect(lg).connect(o.detune); l.start(t + d); l.stop(t + d + 1.2); }
    });
  },
};

export function sfx(name) {
  if (mode === 'off' || !ctx || ctx.state !== 'running' || !SFX[name]) return;
  SFX[name](ctx.currentTime + 0.01);
}
