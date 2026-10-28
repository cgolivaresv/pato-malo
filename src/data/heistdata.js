// Datos del golpe táctico: ciudades, equipo, imprevistos, encargos, preparativos, herramientas y botín.

// Sello de cada ciudad chilena. exits: salidas a pie que pueden aparecer en el plano.
// rain: probabilidad extra de lluvia ese día.
export const CITY_FLAVOR = {
  arica: { t: 'Ciudad de la eterna primavera, con el Morro mirando todo.', exits: ['muelle'] },
  iquique: { t: 'Zona franca, calor y la Cavancha llena de gente.', exits: ['muelle'] },
  sanpedro: { t: 'Pueblo de adobe lleno de turistas; las calles de tierra guardan las huellas.', exits: [] },
  calama: { t: 'Ciudad minera: plata hay, y guardias también.', exits: [] },
  antofagasta: { t: 'La costanera larga y el viento del Pacífico.', exits: ['muelle'] },
  copiapo: { t: 'Plaza con pimientos y mineros de paso.', exits: [] },
  laserena: { t: 'Iglesias de piedra y la Avenida del Mar.', exits: ['muelle'] },
  valparaiso: { t: 'Cerros, escaleras y ascensores: el mejor lugar para perderse.', exits: ['ascensor', 'metro', 'muelle'] },
  santiago: { t: 'Centro lleno de gente, metro y cámaras en cada esquina.', exits: ['metro'] },
  rancagua: { t: 'Capital del rodeo: aquí todos se conocen.', exits: [] },
  talca: { t: 'Calles en damero, uno sur, dos norte: fácil de recorrer y de vigilar.', exits: [] },
  chillan: { t: 'La feria más grande del sur, con olor a longaniza.', exits: [] },
  concepcion: { t: 'Ciudad universitaria, el Biotrén y el río Biobío.', exits: ['metro', 'muelle'] },
  temuco: { t: 'La feria Pinto llena desde temprano.', exits: [] },
  valdivia: { t: 'Lluvia, río y lobos marinos en el mercado.', exits: ['muelle'], rain: 0.3 },
  puertomontt: { t: 'Angelmó, curantos y el puerto.', exits: ['muelle'], rain: 0.3 },
  castro: { t: 'Palafitos y la iglesia de madera.', exits: ['muelle'], rain: 0.3 },
  coyhaique: { t: 'Plaza pentagonal y frío patagón.', exits: [], rain: 0.15 },
  natales: { t: 'Mochileros, viento y montañas.', exits: ['muelle'], rain: 0.15 },
  puntaarenas: { t: 'Un viento que bota, y el estrecho al frente.', exits: ['muelle'], rain: 0.15 },
};

// Salidas a pie
export const FOOT_EXITS = {
  paradero: { n: 'Paradero', d: 'Te subes a una micro y te pierdes.' },
  metro: { n: 'Metro', d: 'Bajas al metro y sales lejos.' },
  ascensor: { n: 'Ascensor', d: 'Subes al cerro en el ascensor y desapareces entre las escaleras.' },
  muelle: { n: 'Muelle', d: 'Un bote te cruza al otro lado de la bahía.' },
};

// Equipo. role: chofer · hacker · campana. cut: parte del botín · sapo: probabilidad de caer y hablar.
export const CREW = [
  { id: 'tono', role: 'chofer', n: 'El Toño', cut: 0.1, sapo: 0.15, d: 'Barato, pero cuando toma, habla.' },
  { id: 'negra', role: 'chofer', n: 'La Negra Valdés', cut: 0.15, sapo: 0.05, d: 'Maneja como en el Dakar: con ella el auto llega más lejos.', far: true },
  { id: 'lucho', role: 'chofer', n: 'Don Lucho', cut: 0.12, sapo: 0.03, d: 'Viejo zorro de los noventa. Nunca ha sapeado a nadie.' },
  { id: 'fran', role: 'hacker', n: 'La Fran', cut: 0.2, sapo: 0.04, d: 'Cara pero impecable: corta las cámaras para siempre.', camsForever: true },
  { id: 'matias', role: 'hacker', n: 'El Cabro Matías', cut: 0.1, sapo: 0.12, d: 'Aprendió en YouTube: las cámaras vuelven a los 8 turnos.' },
  { id: 'byte', role: 'hacker', n: 'Byte', cut: 0.15, sapo: 0.06, d: 'Abre puertas blindadas y cajas electrónicas en 2 turnos, sin ruido.', opener: true },
  { id: 'juana', role: 'campana', n: 'La Señora Juana', cut: 0.08, sapo: 0.04, d: 'Vende sopaipillas en la esquina hace 20 años: conoce la ronda de cada guardia.', routes: true },
  { id: 'flaco', role: 'campana', n: 'El Flaco', cut: 0.1, sapo: 0.06, d: 'Escucha la radio policial: las patrullas tardan 3 turnos más.', delay: 3 },
  { id: 'chicho', role: 'campana', n: 'Chicho', cut: 0.06, sapo: 0.15, d: 'Barato y buena onda, pero bocón.' },
];
export const ROLE_N = { chofer: 'Chofer', hacker: 'Hacker', campana: 'Campana' };
export const ROLE_D = {
  chofer: 'Sin chofer no hay auto para escapar.',
  hacker: 'Corta las cámaras desde el tablero eléctrico del local.',
  campana: 'Vigila la calle; después del golpe te avisa por 12 h lo que sabe la PDI.',
};

// Imprevistos del día
export const DAY_EVENTS = [
  { id: 'normal', n: 'Día normal', d: 'Nada fuera de lo común.', w: 3 },
  { id: 'paro', n: 'Paro de micros', d: 'No hay micros: el paradero no sirve para escapar.', w: 1 },
  { id: 'lluvia', n: 'Lluvia', d: 'Los guardias ven menos y el ruido se pierde rápido.', w: 1.5 },
  { id: 'feria', n: 'Feria libre en la calle', d: 'La calle está llena: las patrullas avanzan a la mitad de velocidad.', w: 1 },
  { id: 'partido', n: 'Partido de la Roja', d: 'Todos mirando la tele: los guardias ven menos y la policía tarda más.', w: 1 },
  { id: 'temblor', n: 'Temblor', d: 'En algún momento se va la luz unos turnos: las cámaras se apagan.', w: 1 },
  { id: 'pago', n: 'Día de pago', d: 'Hay 30% más botín, pero también un guardia más.', w: 1 },
];

// Encargos de un capo: condición, premio y castigo si fallas
export const CONTRACTS = [
  { id: 'sinAlarma', n: 'Sin alarma', d: 'El capo no quiere ruido en la prensa: que no suene la alarma.' },
  { id: 'sinCamaras', n: 'Que no te graben', d: 'Ninguna cámara puede grabarte.' },
  { id: 'reloj', n: 'El reloj del gerente', d: 'Tráele el reloj de oro que el gerente guarda en su oficina.' },
  { id: 'rapido', n: 'Rápido', d: 'Entra y sal en menos de {T} turnos.' },
  { id: 'sinForzar', n: 'Sin forzar nada', d: 'Nada de romper puertas, ventanas ni cajas: entra por las buenas.' },
  { id: 'todo', n: 'Llévatelo casi todo', d: 'Sal con al menos el 70% del botín del lugar.' },
];
export const CAPOS = ['el Gordo Rojas', 'la Tía Rica', 'don Sergio', 'el Turco Abdala'];
// «de el» → «del»; mayúscula al empezar una frase
export const deCapo = (c) => (c.startsWith('el ') ? `del ${c.slice(3)}` : `de ${c}`);
export const Capo = (c) => c.charAt(0).toUpperCase() + c.slice(1);

// Preparativos antes del golpe. cost: se multiplica por el tamaño del botín. sus: sospecha que despiertas.
export const PREP = [
  { id: 'planos', n: 'Comprarle los planos a un arquitecto', d: 'Ves todo el interior desde el principio: cámaras, guardias, botín y el tablero.', cost: 120000, sus: 10 },
  { id: 'conserje', n: 'Sobornar al conserje', d: 'Te deja abierta la puerta de atrás y te cuenta la ronda de los guardias. Puede sapearte.', cost: 100000, sus: 15, sapo: 0.1 },
  { id: 'guardia', n: 'Sobornar a un guardia', d: 'Un guardia hace la vista gorda si te ve. Puede sapearte.', cost: 160000, sus: 15, sapo: 0.1 },
  { id: 'infiltracion', n: 'Trabajar de aseador unos días', d: 'Empiezas adentro y con uniforme: los guardias no te miran hasta que tomas algo o fuerzas algo.', cost: 0, sus: 25 },
  { id: 'tunel', n: 'Cavar un túnel desde el alcantarillado', d: 'Varias noches cavando: entras directo a la bóveda y sales por una alcantarilla. Puede derrumbarse.', cost: 350000, sus: 20, collapse: 0.25 },
  { id: 'llamada', n: 'Llamada falsa a Carabineros', d: 'Un aviso de bomba en otra parte: las patrullas tardan 5 turnos más en llegar.', cost: 50000, sus: 10 },
];

// Herramientas (usos por golpe)
export const TOOLS = {
  ganzua: { n: 'Ganzúa', d: 'Abre una puerta normal en 1 turno, en silencio.', cost: 30000, uses: 3 },
  esmeril: { n: 'Esmeril', d: 'Corta cualquier puerta o caja en 1 turno, con mucho ruido.', cost: 80000, uses: 2 },
  inhibidor: { n: 'Inhibidor de señal', d: 'Las cámaras no te graban durante 6 turnos.', cost: 100000, uses: 1 },
};

// Vehículos de escape
export const VEHICLES = {
  auto: { n: 'Auto del chofer', d: 'Llegas lejos antes de que suene la alarma. Necesita chofer.', cost: 0 },
  moto: { n: 'Moto', d: 'Llegas a una ciudad cercana.', cost: 60000 },
};
export const PLAN_B_COST = 60000;

// Botín por tipo de golpe. v: parte del valor total · w: peso (la mochila carga 10).
export const LOOT = {
  cash: [{ k: 'fajo', n: 'Fajo de billetes', w: 2, v: 3 }, { k: 'bolsa', n: 'Bolsa de monedas', w: 3, v: 2 }, { k: 'sobre', n: 'Sobre con dólares', w: 1, v: 2 }],
  goods: [{ k: 'bandeja', n: 'Bandeja de joyas', w: 1, v: 3, goods: true }],
  gold: [{ k: 'lingote', n: 'Lingote de oro', w: 4, v: 4, goods: true }],
  art: [{ k: 'oleo', n: 'El óleo', w: 5, v: 0, art: true }],
};
export const CAPACITY = 10;
export const HEAVY = 6; // con más peso que esto, cada paso cuesta 2 turnos
