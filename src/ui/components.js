// Piezas de interfaz reutilizables.
import { esc, money, pct } from '../lib/util.js';
import { riskLevel } from '../game/risk.js';
import { I } from './icons.js';

const RISK_TXT = ['Riesgo bajo', 'Riesgo medio', 'Riesgo alto'];

// Chips de una decisión: tiempo, costo o ganancia, y riesgo
export function chips({ h, cost, gain, gainRange, p, riskText, riskLvl }) {
  const out = [];
  if (h != null) out.push(`<span class="chip">${I.clock}${h < 1 ? Math.round(h * 60) + ' min' : (Number.isInteger(h) ? h : h.toFixed(1)) + ' h'}</span>`);
  if (gainRange) out.push(`<span class="chip gain">${I.cash}+${gainRange}</span>`);
  else if (gain != null) out.push(`<span class="chip gain">${I.cash}+${money(gain)}</span>`);
  else if (cost != null) out.push(`<span class="chip">${I.cash}${cost === 0 ? 'Gratis' : money(cost)}</span>`);
  if (p != null || riskText) {
    const lvl = riskLvl ?? riskLevel(p);
    out.push(`<span class="chip risk r${lvl}">${I.shield}${riskText ? esc(riskText) : (p != null ? pct(p) : RISK_TXT[lvl])}</span>`);
  }
  return `<span class="chips">${out.join('')}</span>`;
}

// Tarjeta de decisión: todo el bloque es el botón
export function decision({ act, arg, title, desc, icon, chipsHtml, disabled = false, why = '', primary = false }) {
  const argAttr = arg != null ? ` data-arg="${esc(arg)}"` : '';
  return `<button type="button" class="decision${primary ? ' primary' : ''}" data-act="${act}"${argAttr}${disabled ? ' disabled' : ''}>
    <span class="d-ico">${icon || ''}</span>
    <span class="d-body"><span class="d-title">${title}</span>${desc ? `<span class="d-desc">${desc}</span>` : ''}${chipsHtml || ''}${disabled && why ? `<span class="d-why">${esc(why)}</span>` : ''}</span>
  </button>`;
}

export const group = (title, inner, note = '') => `<section class="group"><h3 class="g-title">${title}</h3>${note ? `<p class="g-note">${note}</p>` : ''}<div class="g-list">${inner}</div></section>`;

// Monto abreviado para la barra superior: $4,5 M · $820 mil
export function shortMoney(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',')} M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)} mil`;
  return `${s}$${Math.round(a)}`;
}
