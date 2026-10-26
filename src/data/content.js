// Contenido del juego: golpes, botín vendible, objetos iniciales y recompensas.

export const CRIMES = [
  {
    id: 'camion', n: 'Asalto a camión de valores', lvl: 2, cash: 4500000, alarm: 1, interpol: 72, marked: true,
    loot: '$450 millones en billetes marcados',
    d: 'Tienes efectivo, pero los billetes están marcados: pagar montos grandes deja rastro.',
    obj: ['leave'],
  },
  {
    id: 'joyas', n: 'Golpe a joyería', lvl: 3, cash: 900000, alarm: 3, interpol: 96,
    loot: 'joyas por $180 millones', lootVal: 180e6,
    d: 'Debes vender las joyas a un reducidor en Sudamérica y luego salir del continente.',
    obj: ['sell', 'leave'],
  },
  {
    id: 'arte', n: 'Robo de un óleo colonial', lvl: 4, cash: 3200000, alarm: 2, interpol: 48,
    loot: 'un óleo de la Escuela Cuzqueña',
    d: 'Un comprador te espera en una capital lejana. Interpol entra al caso a las 48 horas.',
    obj: ['deliver'],
  },
];

// Parte del botín que se puede vender en la calle a mitad de precio
export const LOTS = {
  joyas: { n: 'un lote de joyas', count: 4 },
  camion: { n: 'un fajo de billetes marcados', count: 4, val: 1400000 },
  arte: { n: 'una pieza menor del mismo robo', count: 2, val: 900000 },
};

// Tus cosas al empezar la fuga (v = valor, risk = probabilidad de dejar rastro al venderla)
export const START_ITEMS = [
  { n: 'Reloj suizo', v: 180000, risk: 0.15, tr: 'Un relojero reporta un reloj suizo con número de serie del prófugo.' },
  { n: 'Notebook', v: 220000, risk: 0.12, tr: 'El notebook vendido se conectó a internet: la PDI rastrea su origen.' },
  { n: 'Celular', v: 90000, risk: 0.25, tr: 'Tu celular viejo apareció en una feria y lo vincularon a ti.' },
  { n: 'Chaqueta de cuero', v: 45000, risk: 0 },
];

// Recompensas por cada día sin ser atrapado
export const REWARDS = [
  { k: 'cash', n: 'Giro de tu red', d: 'Un primo te manda plata por un canal limpio.' },
  { k: 'item', n: 'Reloj de oro', d: 'Lo ganaste en una partida de cartas. Se puede vender.', item: { n: 'Reloj de oro', v: 350000, risk: 0.1, tr: 'Un reloj de oro vendido en la calle lleva a la PDI hasta ti.' } },
  { k: 'press', n: 'Credencial de prensa falsa', d: 'Reduce a la mitad el riesgo de tu próximo control de documentos.' },
  { k: 'map', n: 'Mapa de pasos cordilleranos', d: 'Los pasos clandestinos cuestan 40% menos y son la mitad de riesgosos.' },
  { k: 'bus', n: 'Pasaje de bus abierto', d: 'Tu próximo viaje en bus es gratis.' },
  { k: 'safe', n: 'Nueva casa segura', d: 'Un viejo conocido te ofrece su casa.' },
  { k: 'soplon', n: 'Número directo del soplón', d: 'Tu próxima consulta al soplón es gratis.' },
];
