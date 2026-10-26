// Utilidades generales.

export const $ = (s) => document.querySelector(s);
export const R = Math.random;
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const clamp01 = (x) => Math.min(0.95, Math.max(0, x));
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const money = (n) => '$' + Math.round(n).toLocaleString('es-CL');
export const pct = (x) => Math.round(x * 100) + '%';

// Distancia en km entre dos ciudades (fórmula del haversine)
export function dist(a, b) {
  const R = 6371, r = Math.PI / 180, dl = (b.la - a.la) * r, dn = (b.lo - a.lo) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a.la * r) * Math.cos(b.la * r) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Hora del juego: la fuga empieza el lunes a las 22:00
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export function clock(h) {
  const t = 22 + h, d = Math.floor(t / 24), hh = Math.floor(t % 24), mm = Math.floor(((t % 1) * 60) / 15) * 15;
  return `${DAYS[d % 7]} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// localStorage con manejo de errores (modo privado, almacenamiento bloqueado)
export function store(k, v) {
  try {
    if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    return null;
  }
}
