// Contenido del juego: golpes, botín vendible, objetos iniciales y recompensas.

// Golpes, de menor a mayor dificultad. rank: rango mínimo para desbloquearlo · lvl: dificultad (1-5)
// kind: cash (efectivo) · goods (hay que vender al reducidor) · art (entregar a un comprador)
// obj: cross (casa segura fuera de Chile) · leave (salir del continente) · sell · deliver
// city: dónde ocurre (si no, una ciudad chilena al azar) · lot: parte del botín vendible en la calle
// interpol: Infinity = Interpol no entra al caso
export const CRIMES = [
  {
    id: 'lanzazo', n: 'Lanzazo en el persa', rank: 0, lvl: 1, kind: 'cash',
    cash: 500000, alarm: 1, interpol: Infinity, heat: 12,
    loot: 'una mochila con $2 millones',
    d: 'Un golpe chico para partir. Cruza la frontera y escóndete en una casa segura fuera de Chile.',
    obj: ['cross'], lot: { n: 'un par de celulares robados', count: 2, val: 160000 },
  },
  {
    id: 'bencina', n: 'Asalto a una bomba de bencina en la Ruta 5', rank: 1, lvl: 2, kind: 'cash',
    cash: 800000, alarm: 0.5, interpol: Infinity, heat: 28, far: 1100,
    loot: 'la recaudación del fin de semana',
    d: 'La carretera está llena de cámaras y peajes. Tu red solo tiene casas seguras lejos, al otro lado de la frontera.',
    obj: ['cross'], lot: { n: 'un rollo de billetes', count: 2, val: 250000 },
  },
  {
    id: 'cambio', n: 'Golpe a una casa de cambio', rank: 2, lvl: 3, kind: 'cash',
    cash: 3400000, alarm: 2, interpol: 120, heat: 20,
    loot: 'USD 300.000 en efectivo',
    d: 'Dólares limpios, pero el centro está lleno de cámaras. Después arma tu plan de escape y sal del continente.',
    obj: ['leave'], lot: { n: 'un fajo de dólares', count: 3, val: 1000000 },
  },
  {
    id: 'camion', n: 'Asalto a camión de valores', rank: 2, lvl: 3, kind: 'cash', marked: true,
    cash: 4500000, alarm: 1, interpol: 72, heat: 20,
    loot: '$450 millones en billetes marcados',
    d: 'Tienes efectivo, pero los billetes están marcados: pagar montos grandes deja rastro.',
    obj: ['leave'], lot: { n: 'un fajo de billetes marcados', count: 4, val: 1400000 },
  },
  {
    id: 'joyas', n: 'Golpe a joyería', rank: 3, lvl: 4, kind: 'goods', gn: 'joyas', goods: 'las joyas',
    cash: 1500000, alarm: 3, interpol: 96, heat: 20,
    loot: 'joyas por $180 millones', lootVal: 180e6,
    d: 'Debes vender las joyas a un reducidor en Sudamérica y luego salir del continente.',
    obj: ['sell', 'leave'], lot: { n: 'un lote de joyas', count: 4 },
  },
  {
    id: 'arte', n: 'Robo de un óleo colonial', rank: 3, lvl: 4, kind: 'art',
    cash: 3200000, alarm: 2, interpol: 48, heat: 20,
    loot: 'un óleo de la Escuela Cuzqueña',
    d: 'Un comprador te espera en una capital lejana. Interpol entra al caso a las 48 horas.',
    obj: ['deliver'], lot: { n: 'una pieza menor del mismo robo', count: 2, val: 900000 },
  },
  {
    id: 'casino', n: 'La bóveda de un casino', rank: 4, lvl: 5, kind: 'cash', marked: true,
    cash: 4000000, alarm: 0.5, interpol: 24, heat: 35,
    loot: '$900 millones en billetes marcados',
    d: 'El golpe del siglo. Billetes marcados, la prensa entera encima e Interpol desde el primer día.',
    obj: ['leave'], lot: { n: 'un maletín de fichas y fajos', count: 4, val: 2200000 },
  },
  {
    id: 'boveda', n: 'Lingotes de una bóveda bancaria', rank: 4, lvl: 5, kind: 'goods', gn: 'oro', goods: 'el oro',
    cash: 1500000, alarm: 2, interpol: 36, heat: 30,
    loot: 'lingotes de oro por $600 millones', lootVal: 600e6,
    d: 'Hay que vender el oro a un reducidor antes de salir del continente. Interpol entra al caso al día y medio.',
    obj: ['sell', 'leave'], lot: { n: 'un lingote de oro', count: 4 },
  },
];

// Parte del botín que se puede vender en la calle (por golpe)
export const LOTS = Object.fromEntries(CRIMES.map((c) => [c.id, c.lot]));

// Rangos de la carrera criminal de Pato Malo
export const RANKS = [
  { n: 'Ratero', xp: 0 },
  { n: 'Lanza', xp: 120 },
  { n: 'Choro', xp: 350 },
  { n: 'Capo', xp: 800 },
  { n: 'Leyenda', xp: 1600 },
];

// Habilidades: se compran con puntos que ganas al subir de rango y al escapar. Máximo 3 niveles.
export const SKILLS = {
  sigilo: { n: 'Sigilo', icon: 'mask', d: 'Cada nivel: 10% de tus rastros nunca aparece y el golpe sale limpio más seguido.' },
  labia: { n: 'Labia', icon: 'news', d: 'Cada nivel: los rumores del bajo mundo son 7% más confiables.' },
  contactos: { n: 'Contactos', icon: 'house', d: 'Cada nivel: una casa segura más y los contactos de salida cobran 8% menos.' },
  manos: { n: 'Manos rápidas', icon: 'coins', d: 'Cada nivel: 10% más de botín en el golpe y al venderlo.' },
  aguante: { n: 'Aguante', icon: 'clock', d: 'Cada nivel: aguantas 2 horas más sin dormir.' },
};

// Planificación del golpe. Cada paso tiene opciones; multi: se pueden elegir varias.
// cost: plata (se multiplica por la dificultad del golpe) · cut: parte del botín para el equipo
// clean: cambia la probabilidad de que el golpe salga limpio
export const PLAN = [
  {
    id: 'recon', n: 'Reconocimiento', q: '¿Cuánto vigilas el lugar antes?',
    opts: [
      { id: 'rapido', n: 'A la rápida', d: 'Sin vigilar. Entras y sales con lo que veas.', clean: -0.15 },
      { id: 'dia', n: 'Un día vigilando', d: 'Cuentas guardias y cámaras desde la vereda de enfrente.', cost: 60000 },
      { id: 'semana', n: 'Una semana con fotos y planos', d: 'Sabes cada turno y cada punto ciego.', cost: 200000, clean: 0.15 },
    ],
  },
  {
    id: 'crew', n: 'Equipo', q: '¿A quién llevas? Cada uno cobra su parte y puede sapearte si cae.', multi: true,
    opts: [
      { id: 'chofer', n: 'Chofer', d: 'Te saca rápido y permite escapar en auto.', cut: 0.15, clean: 0.03 },
      { id: 'hacker', n: 'Hacker', d: 'Apaga las cámaras: la alarma suena 2 horas más tarde.', cut: 0.2, clean: 0.1 },
      { id: 'campana', n: 'Campana', d: 'Vigila la calle y, después del golpe, te avisa por 12 h lo que sabe la PDI.', cut: 0.1, clean: 0.08 },
    ],
  },
  {
    id: 'hora', n: 'Horario', q: '¿Cuándo das el golpe?',
    opts: [
      { id: 'noche', n: 'De noche', d: 'Menos testigos y menos guardias.', clean: 0.08, t0: 22 },
      { id: 'dia', n: 'A pleno día', d: 'La caja está llena, pero hay más ojos: sales con más calor.', clean: -0.1, loot: 1.3, t0: 13 },
      { id: 'partido', n: 'Durante un partido de la Roja', d: 'Todo Chile mirando la tele: la alarma tarda 1 hora más.', clean: 0.04, t0: 21 },
    ],
  },
  {
    id: 'tools', n: 'Herramientas', q: '¿Qué llevas?', multi: true,
    opts: [
      { id: 'guantes', n: 'Guantes', d: 'Sin huellas: sales con menos calor.', cost: 30000, clean: 0.03 },
      { id: 'mascara', n: 'Máscara de luchador', d: 'Nadie ve tu cara: sales con menos calor.', cost: 25000, clean: 0.04 },
      { id: 'inhibidor', n: 'Inhibidor de señal', d: 'La alarma tarda 1 hora más y es menos probable que salte antes.', cost: 150000 },
      { id: 'repartidor', n: 'Disfraz de repartidor', d: 'Empiezas la fuga disfrazado por 24 horas.', cost: 60000 },
    ],
  },
  {
    id: 'salida', n: 'Escape del lugar', q: '¿Cómo te vas apenas sales con el botín?',
    opts: [
      { id: 'pie', n: 'A pie y en micro', d: 'Te pierdes entre la gente. Empiezas en la ciudad del golpe.' },
      { id: 'moto', n: 'En moto', d: 'Antes de la alarma ya estás en otra ciudad cercana.', cost: 80000 },
      { id: 'auto', n: 'En el auto del chofer', d: 'Llegas lejos antes de la alarma, pero el auto puede aparecer abandonado.', need: 'chofer' },
    ],
  },
];

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

// Precio que paga un reducidor por las joyas, como fracción de su valor
export const FENCE_RATE = 0.015;

// Contactos para salir del continente. Cada partida esconde a cada uno en una de sus ciudades posibles.
export const CONTACTS = {
  forger: {
    n: 'Falsificador maestro', short: 'el falsificador', icon: 'id',
    cities: ['lima', 'buenosaires', 'lapaz', 'bogota', 'asuncion', 'cordoba', 'montevideo', 'santacruz', 'arequipa', 'rosario'],
    price: 1200000, hours: 8,
    exit: 'Vuelo comercial', exitDesc: 'Con su pasaporte de calidad, migraciones casi no te mira. Vuelas desde un aeropuerto internacional.',
  },
  captain: {
    n: 'Capitán de carguero', short: 'el capitán', icon: 'ship',
    cities: ['valparaiso', 'antofagasta', 'buenosaires', 'montevideo', 'lima', 'arica', 'concepcion', 'puertomontt', 'trujillo'],
    price: 2000000,
    exit: 'Carguero', exitDesc: 'Viajas escondido entre contenedores. No hay migraciones, pero el barco zarpa solo dos días a la semana.',
  },
  pilot: {
    n: 'Piloto de avioneta', short: 'el piloto', icon: 'plane',
    cities: ['salta', 'santacruz', 'cochabamba', 'talca', 'tucuman', 'bariloche', 'cusco'],
    price: 1500000,
    exit: 'Avioneta', exitDesc: 'Despega de una pista de tierra a las 03:00. Rápida y sin controles, pero un control policial en la ciudad lo arruina.',
  },
};
