// Eventos con decisiones: situaciones en viajes y ciudades con dos o tres opciones.
// Cada opción declara su costo y riesgo (chips) para que el jugador decida sabiendo lo que arriesga.
import { CITY, COUNTRIES, BIG, CONO } from '../data/geo.js';
import { R, money } from '../lib/util.js';
import { S, crime, me, policeHere } from './state.js';
import { addTrace, news, pay, advance, caught } from './engine.js';
import { inZone } from './pursuit.js';
import { spreadHeat } from './heat.js';
import { rumor, wanted } from './plan.js';

const heatHere = (n) => { S.heat = Math.max(0, Math.min(100, S.heat + n)); };
const traceHere = (delay, txt) => addTrace(S.cur, delay, txt);
const spend = (h, rate = 0.04) => { advance(h, { where: 'city', rate }); S.awake += h; };
const here = () => me().n;
const pct = (p) => `${Math.round(p * 100)}%`;
const lvl = (p) => (p < 0.15 ? 0 : p < 0.35 ? 1 : 2);

// Lo que dice McCuack cuando llama: culto, formal e irónico
const CALLS = [
  'Sé que está cerca, señor Pato. La ley también tiene patas.',
  'Buenas noches. Llamo para comentarle que su fotografía de prontuario no le hace justicia.',
  'No cuelgue, por favor. Estamos rastreando… digo, conversando.',
  'Disculpe la hora. Los detectives no dormimos; los prófugos, por lo visto, tampoco.',
  'Le hablo como un caballero a otro: entréguese antes de que se me enfríe el té.',
];

export const EVENTS = [
  {
    id: 'taxista', w: 3, mood: 'sorprendido', title: 'El taxista te reconoce',
    when: (c) => BIG.has(S.cur) && S.heat >= 25,
    text: () => 'El taxista te mira por el retrovisor: «Oiga… ¿usted no es el pato que sale en las noticias?»',
    choices: () => [
      { label: 'Pasarle plata para que se olvide', desc: 'Un billete grande y una sonrisa.', chips: { cost: 120000, riskText: 'Sin rastro', riskLvl: 0 }, need: 120000,
        run: () => { pay(120000); return 'Se guardó el billete y subió el volumen de la radio. Nunca te vio.'; } },
      { label: 'Bajarte en la esquina y caminar', desc: 'Pierdes una hora, pero quizás no se acuerde de ti.', chips: { h: 1, riskText: 'Rastro 35%', riskLvl: 1 },
        run: () => { spend(1); if (R() < 0.35) { traceHere(4, `Un taxista de ${here()} llama a la PDI: llevó a un pato con lentes oscuros.`); return 'Te bajaste rápido, pero alcanzaste a ver que anotaba algo en su celular.'; } return 'Caminaste diez cuadras. El taxista ya se olvidó de ti.'; } },
      { label: 'Hacerte el ofendido', desc: '«¿Pato? Soy cisne, caballero.»', chips: { riskText: 'Rastro 50%', riskLvl: 2 },
        run: () => { if (R() < 0.5) { traceHere(2, `Un taxista de ${here()} jura que llevó al prófugo «haciéndose el cisne».`); heatHere(5); return 'No te creyó nada. Al bajarte, lo viste marcar un número.'; } return 'Se rió y te pidió disculpas. Funcionó.'; } },
    ],
  },
  {
    id: 'control_ruta', w: 4, mood: 'sorprendido', title: 'Control carretero',
    when: (c) => c.kind === 'travel' && c.mode === 'bus' && CITY[c.from].c === CITY[c.to].c,
    vals: () => ({ p: Math.min(0.9, (S.id === 'real' || S.idBurnSecret ? 0.22 : S.passQ === 'top' ? 0.03 : 0.08) + S.heat / 320) }),
    text: () => 'El bus frena: dos kilómetros antes de llegar, Carabineros está pidiendo documentos.',
    choices: (v) => [
      { label: 'Quedarte en el asiento', desc: 'Muestras tu documento y rezas.', chips: { riskText: `Te detienen ${pct(v.p)}`, riskLvl: lvl(v.p) },
        run: () => { if (R() < v.p) { caught(`En un control carretero antes de ${here()}, el carabinero reconoció tu cara. Se acabó la fuga.`); return ''; } return 'El carabinero miró tu documento, bostezó y te lo devolvió.'; } },
      { label: 'Bajarte antes y cruzar por el cerro', desc: 'Cuatro horas de caminata, pero nadie te pide nada.', chips: { h: 4, riskText: 'Rastro 10%', riskLvl: 0 },
        run: () => { spend(4); if (R() < 0.1) traceHere(10, `Un vecino cerca de ${here()} vio a un pato bajando del cerro de noche.`); return 'Llegaste embarrado hasta las rodillas, pero sin control.'; } },
      { label: 'Sobornar al carabinero', desc: 'Algunos aceptan. Otros no.', chips: { cost: 180000, riskText: 'Se niega 25%', riskLvl: 1 }, need: 180000,
        run: () => { pay(180000); if (R() < 0.25) { traceHere(1, `Un carabinero denuncia un intento de soborno del prófugo cerca de ${here()}.`); heatHere(10); return 'Se guardó la plata como evidencia y pidió refuerzos. Alcanzaste a perderte en la noche.'; } return 'Te devolvió el carnet doblado con la plata adentro. Asunto cerrado.'; } },
    ],
  },
  {
    id: 'pasajero', w: 3, mood: 'normal', title: 'Un pasajero curioso',
    when: (c) => c.kind === 'travel' && (c.mode === 'bus' || c.mode === 'air'),
    text: () => 'Tu compañero de asiento no para de mirarte. Al final pregunta: «¿No te he visto en la tele?»',
    choices: () => [
      { label: 'Hacerte el dormido', desc: 'Lentes, gorra y ronquidos.', chips: { riskText: 'Rastro 40%', riskLvl: 2 },
        run: () => { if (R() < 0.4) { traceHere(6, `Un pasajero llegado a ${here()} cree haber viajado al lado del prófugo.`); return 'Se pasó todo el viaje mirándote. Seguro va a contar algo.'; } return 'Se aburrió y se puso a ver una película.'; } },
      { label: 'Contarle que eres doble de cine', desc: 'Si te cree, quizás conozca a alguien útil.', chips: { riskText: 'Rastro 25%', riskLvl: 1 },
        run: () => { if (R() < 0.25) { traceHere(6, `Un pasajero llegado a ${here()} describe a un «doble de cine» sospechoso.`); return 'No te creyó. Te sacó una foto disimuladamente.'; } if (wanted().length) { rumor(me(), R() < 0.8); return 'Le encantó la historia. Te contó un dato del bajo mundo, «por si te sirve para una película».'; } return 'Le encantó la historia y te pidió un autógrafo.'; } },
      { label: 'Bajarte en la parada anterior', desc: 'Tres horas más de viaje, pero sin testigos.', chips: { h: 3, riskText: 'Sin rastro', riskLvl: 0 },
        run: () => { spend(3); return 'Te bajaste en un pueblo y seguiste en colectivo.'; } },
    ],
  },
  {
    id: 'celular', w: 2, mood: 'guino', title: 'Un celular olvidado', max: 1,
    when: (c) => c.kind === 'travel' && c.mode === 'bus',
    text: () => 'Alguien olvidó un celular de última generación en el asiento de al lado.',
    choices: () => [
      { label: 'Quedártelo para venderlo', desc: 'Vale buena plata, pero se puede rastrear.', chips: { gain: 70000, riskText: 'Rastreable', riskLvl: 1 },
        run: () => { S.items.push({ n: 'Celular ajeno', v: 70000, risk: 0.3, tr: 'El celular robado en un bus apareció en manos del prófugo.' }); return 'Lo guardaste en la chaqueta. Ya verás dónde venderlo.'; } },
      { label: 'Entregárselo al chofer', desc: 'Una buena acción baja el calor.', chips: { riskText: 'Calor −3', riskLvl: 0 },
        run: () => { heatHere(-3); return 'El chofer te agradeció. «Hay gente honrada todavía», dijo.'; } },
    ],
  },
  {
    id: 'arriero', w: 4, mood: 'normal', title: 'El arriero',
    when: (c) => c.kind === 'travel' && c.mode === 'paso',
    text: () => 'Un arriero con su mula te alcanza en el sendero. «Conozco un atajo, y sé guardar silencio… por un precio.»',
    choices: () => [
      { label: 'Pagarle por el atajo y su silencio', desc: 'Nadie en el pueblo sabrá que pasaste.', chips: { cost: 100000, riskText: 'Calor −10 aquí', riskLvl: 0 }, need: 100000,
        run: () => { pay(100000); heatHere(-10); return 'Llegaste por un atajo entre lengas. Nadie te vio entrar al país.'; } },
      { label: 'Agradecer y seguir solo', desc: 'Él contará en el pueblo que vio a un forastero.', chips: { riskText: 'Rastro 25%', riskLvl: 1 },
        run: () => { if (R() < 0.25) traceHere(10, `Un arriero cerca de ${here()} habla de un pato que cruzó la cordillera a pie.`); return 'Seguiste solo. El arriero te miró irte, pensativo.'; } },
    ],
  },
  {
    id: 'picada', w: 4, mood: 'feliz', title: 'Un dato en la picada',
    when: (c) => c.kind === 'city' && wanted().length > 0,
    text: () => 'En una picada, un viejo con boina jura que conoce a «gente que saca gente del país».',
    choices: () => [
      { label: 'Invitarle un pisco', desc: 'Los viejos saben cosas. Casi siempre son ciertas.', chips: { h: 1, cost: 15000, riskText: 'Dato cierto 85%', riskLvl: 0 }, need: 15000,
        run: () => { pay(15000); spend(1); rumor(me(), R() < 0.85); return 'Entre pisco y pisco te soltó un dato. Lo anotaste en el plan de escape.'; } },
      { label: 'Ignorarlo', desc: 'No es momento de conversar.', chips: { riskText: 'Nada', riskLvl: 0 }, run: () => 'Pagaste tu bebida y te fuiste.' },
    ],
  },
  {
    id: 'periodista', w: 2, mood: 'sorprendido', title: 'Una periodista', max: 1,
    when: (c) => c.kind === 'city' && S.heat >= 35,
    text: () => 'Una periodista de un matinal te reconoce en un café. «Te pago por una entrevista exclusiva. Nadie sabrá dónde te encontré.»',
    choices: () => [
      { label: 'Aceptar la entrevista', desc: 'Buena plata, pero tu cara sale en todo el continente.', chips: { gain: 600000, riskText: 'Rastro seguro y calor +25', riskLvl: 2 },
        run: () => { S.cash += 600000; spreadHeat(me().c, 25); traceHere(8, `El matinal emite una entrevista exclusiva con el prófugo, grabada en ${here()}.`); return 'La entrevista quedó buenísima. McCuack también la va a ver.'; } },
      { label: 'Pagarle por su silencio', desc: 'Le cuesta, pero sabe guardar secretos.', chips: { cost: 250000, riskText: 'Sin rastro', riskLvl: 0 }, need: 250000,
        run: () => { pay(250000); return 'Guardó la plata y su libreta. Nunca te vio.'; } },
      { label: 'Negarte y salir del café', desc: 'Puede publicar igual lo que vio.', chips: { riskText: 'Rastro 30%', riskLvl: 1 },
        run: () => { if (R() < 0.3) { traceHere(6, `Una periodista publica que vio al prófugo en un café de ${here()}.`); return 'Al otro día, tu foto en el café salió en redes sociales.'; } return 'Se encogió de hombros y siguió con su café.'; } },
    ],
  },
  {
    id: 'exsocio', w: 2, mood: 'normal', title: 'El Chino Ramírez', max: 1,
    when: (c) => c.kind === 'city' && CONO.includes(me().c),
    text: () => 'Tu ex socio, el Chino Ramírez, te reconoce en la calle. «¡Compadre! Ando cortito de plata… por los viejos tiempos.»',
    choices: () => [
      { label: 'Pasarle $300.000', desc: 'Queda debiéndote un favor: casa y datos.', chips: { cost: 300000, riskText: 'Casa segura + dato', riskLvl: 0 }, need: 300000,
        run: () => { pay(300000); if (!S.safe.includes(S.cur)) S.safe.push(S.cur); if (wanted().length) rumor(me(), true); return `El Chino te ofreció su casa en ${here()} como casa segura y te pasó un dato confiable.`; } },
      { label: 'Decirle que no', desc: 'Al Chino no le gusta que le digan que no.', chips: { riskText: 'Te delata 30%', riskLvl: 1 },
        run: () => { if (R() < 0.3) { traceHere(3, `Llamado anónimo: «el pato está en ${here()}». La voz se parece a la del Chino Ramírez.`); return 'Se fue enojado. Algo te dice que va a hacer una llamada.'; } return 'Se fue refunfuñando, pero no es mala gente.'; } },
      { label: 'Amenazarlo', desc: 'Que entienda que no te conviene como enemigo.', chips: { riskText: 'Rastro 50%', riskLvl: 2 },
        run: () => { if (R() < 0.5) { traceHere(1, `El Chino Ramírez denuncia amenazas del prófugo en ${here()}.`); heatHere(8); return 'Mala idea. Corrió directo a la comisaría.'; } return 'Se puso pálido y desapareció.'; } },
    ],
  },
  {
    id: 'perro', w: 3, mood: 'sorprendido', title: 'Perro detector',
    when: (c) => c.kind === 'travel' && c.mode === 'air' && S.lots > 0 && crime().kind !== 'cash',
    text: () => 'En el aeropuerto, un perro detector se detiene frente a tu maleta y empieza a ladrar.',
    choices: () => [
      { label: 'Distraerlo con un sándwich', desc: 'Los perros también tienen hambre.', chips: { riskText: 'Revisan tu maleta 35%', riskLvl: 1 },
        run: () => { if (R() < 0.35) { traceHere(1, `Un perro detector en ${here()} encontró restos del botín en la maleta de un pato.`); heatHere(15); return 'El guía notó el truco. Alcanzaste a huir, pero sabrán que estuviste aquí.'; } return 'El perro se comió el sándwich feliz y se olvidó de ti.'; } },
      { label: 'Dejar parte del botín en el baño', desc: 'Pierdes una pieza, pero nadie te revisa.', chips: { riskText: 'Pierdes 1 pieza', riskLvl: 0 },
        run: () => { S.lots--; if (crime().kind === 'goods' && S.lots <= 0) { S.lots = 0; S.sold = true; } return 'Dejaste una pieza detrás del estanque del baño. El perro siguió de largo.'; } },
    ],
  },
  {
    id: 'llamada', w: 3, face: 'det', title: 'Llamada de McCuack', max: 2,
    when: () => S.traces.filter((t) => t.shown).length >= 2,
    text: () => `Suena tu celular. Una voz grave y muy educada: «${CALLS[Math.floor(S.hours) % CALLS.length]}»`,
    choices: () => [
      { label: 'Provocarlo', desc: 'Si habla de más, sabrás dónde está su brigada.', chips: { riskText: 'Calor +5', riskLvl: 1 },
        run: () => { heatHere(5); S.soplonUntil = Math.max(S.soplonUntil, S.hours + 12); return 'Se enojó y habló de más. Durante 12 h sabes qué rastros tuyos está por descubrir.'; } },
      { label: 'Colgar y botar el chip', desc: 'Un chip nuevo cuesta poco.', chips: { cost: 15000, riskText: 'Nada', riskLvl: 0 }, need: 15000,
        run: () => { pay(15000); return 'Botaste el chip en un tacho. Silencio.'; } },
      { label: 'Ofrecerle un trato', desc: 'Todos tienen un precio… ¿o no?', chips: { riskText: 'Te rastrean 75%', riskLvl: 2 },
        run: () => { if (R() < 0.25) { S.zone = null; return 'McCuack se quedó callado. Por un rato, la zona de búsqueda desapareció del mapa.'; } traceHere(1, `McCuack rastreó la llamada del prófugo hasta ${here()}.`); return '«Gracias por quedarte en línea», dijo McCuack, y colgó.'; } },
    ],
  },
  {
    id: 'sismo', w: 2, mood: 'sorprendido', title: '¡Temblor!', max: 1,
    when: (c) => ['CL', 'PE'].includes(me().c),
    text: () => 'Un temblor fuerte sacude la ciudad. Se corta la luz y hay caos en las calles.',
    choices: () => [
      { label: 'Ayudar a los vecinos', desc: 'Te ven como héroe, no como prófugo.', chips: { h: 3, riskText: 'Calor −15', riskLvl: 0 },
        run: () => { spend(3); heatHere(-15); return 'Sacaste a una abuelita de su casa. Nadie habla del prófugo, todos hablan del pato héroe.'; } },
      { label: 'Aprovechar el caos', desc: 'Por 10 horas, los controles casi no funcionan.', chips: { riskText: 'Controles −70% por 10 h', riskLvl: 0 },
        run: () => { S.perks.chaosUntil = S.hours + 10; return 'Con las comunicaciones caídas, los controles casi no funcionan. ¡Hay que moverse ya!'; } },
    ],
  },
  {
    id: 'fonda', w: 2, mood: 'feliz', title: 'Fonda en la plaza', max: 1,
    when: (c) => me().c === 'CL',
    text: () => 'Hay fonda en la plaza: cueca, empanadas, terremotos y mucha gente.',
    choices: () => [
      { label: 'Mezclarte entre la gente', desc: 'Nadie busca a un pato bailando cueca.', chips: { h: 2, riskText: 'Calor −8', riskLvl: 0 },
        run: () => { spend(2); heatHere(-8); return 'Bailaste un pie de cueca con pañuelo y todo. Nadie sospechó.'; } },
      { label: 'Carterear a los curados', desc: 'Plata fácil, si no te pillan.', chips: { gainRange: '$150–250 mil', riskText: 'Te pillan 20%', riskLvl: 1 },
        run: () => { const g = 150000 + Math.round(R() * 10) * 10000; S.cash += g; if (R() < 0.2) { traceHere(2, `En la fonda de ${here()} denuncian a un pato carterista.`); heatHere(10); return `Sacaste ${money(g)}, pero un guardia te vio la cara.`; } return `Sacaste ${money(g)} entre cueca y cueca.`; } },
    ],
  },
  {
    id: 'quiltro', w: 2, mood: 'feliz', title: 'Un quiltro', max: 1,
    when: () => !S.perks.quiltro,
    text: () => 'Un quiltro flaco te sigue moviendo la cola. No se separa de ti.',
    choices: () => [
      { label: 'Adoptarlo', desc: '«Nadie sospecha de un pato que pasea a su perro.»', chips: { riskText: 'Controles −15%', riskLvl: 0 },
        run: () => { S.perks.quiltro = true; return 'Le pusiste Cachupín. Desde ahora viaja contigo y los controles te miran con ternura.'; } },
      { label: 'Darle una sopaipilla y seguir', desc: 'Ya tienes suficientes problemas.', chips: { riskText: 'Nada', riskLvl: 0 },
        run: () => 'Se comió la sopaipilla y se quedó mirándote irte.' },
    ],
  },
  {
    id: 'sirenas', w: 4, face: 'det', title: 'Sirenas cerca',
    when: (c) => c.kind === 'city' && (inZone(me()) || policeHere()),
    vals: () => ({ p: policeHere() ? 0.3 : 0.1 }),
    text: () => 'Escuchas sirenas a dos cuadras. Están allanando una casa del barrio.',
    choices: (v) => [
      { label: 'Salir por la ventana y alejarte', desc: 'Pierdes una hora y te ven correr.', chips: { h: 1, riskText: 'Calor +4', riskLvl: 0 },
        run: () => { spend(1); heatHere(4); return 'Saltaste dos techos y te perdiste en otro barrio.'; } },
      { label: 'Quedarte quieto con la luz apagada', desc: policeHere() ? 'La brigada está en la ciudad.' : 'Probablemente no es por ti.', chips: { h: 2, riskText: policeHere() ? `Te encuentran ${pct(v.p)}` : 'Rastro 10%', riskLvl: lvl(v.p) },
        run: () => { if (policeHere() && R() < v.p) { caught(`La brigada de McCuack revisó casa por casa en ${here()}. Te encontraron debajo de la cama.`); return ''; } if (!policeHere() && R() < 0.1) traceHere(4, `Vecinos de ${here()} vieron a un pato espiando la redada por la ventana.`); spend(2); return 'Las sirenas se alejaron. Respiraste.'; } },
    ],
  },
  {
    id: 'cajero', w: 2, mood: 'guino', title: 'Un cajero generoso', max: 1,
    when: (c) => c.kind === 'city' && BIG.has(S.cur),
    text: () => 'Un cajero automático está fallado: entrega el doble de billetes de lo que marca.',
    choices: () => [
      { label: 'Sacar todo lo que puedas', desc: 'Las cámaras graban todo.', chips: { gain: 300000, riskText: 'Rastro 40%', riskLvl: 2 },
        run: () => { S.cash += 300000; if (R() < 0.4) { traceHere(6, `Las cámaras de un cajero en ${here()} muestran al prófugo sacando plata.`); return 'Sacaste $300.000. La cámara del cajero también te sacó una foto.'; } return 'Sacaste $300.000 y la cámara estaba tapada con un chicle.'; } },
      { label: 'Seguir de largo', desc: 'No vale la pena.', chips: { riskText: 'Nada', riskLvl: 0 }, run: () => 'Seguiste caminando con las manos en los bolsillos.' },
    ],
  },
];

const PROB = { travel: 0.38, city: 0.16 };

// Puede disparar un evento después de un viaje o de una acción en la ciudad
export function maybeEvent(kind, ctx = {}) {
  if (!S || S.over || S.event || S.noEvents) return;
  if (Math.random() > PROB[kind]) return;
  const c = { kind, ...ctx };
  const opts = EVENTS.filter((e) => e.when(c) && (S.seenEv[e.id] || 0) < (e.max || 2) && S.lastEv !== e.id);
  if (!opts.length) return;
  let r = Math.random() * opts.reduce((a, e) => a + e.w, 0);
  const e = opts.find((x) => (r -= x.w) < 0) || opts[0];
  S.seenEv[e.id] = (S.seenEv[e.id] || 0) + 1;
  S.lastEv = e.id;
  S.evCount++;
  S.event = { id: e.id, ctx: c, vals: e.vals ? e.vals(c) : {}, result: null };
}

export const currentEvent = () => (S && S.event ? EVENTS.find((e) => e.id === S.event.id) : null);
export const eventChoices = () => { const e = currentEvent(); return e ? e.choices(S.event.vals, S.event.ctx) : []; };

export function resolveEvent(i) {
  const e = currentEvent();
  if (!e || S.event.result != null || S.over) return;
  const ch = eventChoices()[i];
  if (!ch || (ch.need && S.cash < ch.need)) return;
  const res = ch.run(S.event.vals, S.event.ctx) || '';
  if (S.over) return;
  S.event.result = res;
  S.event.picked = i;
  if (res) news(S.hours, `${e.title}: ${res}`, 'me');
}

export function closeEvent() { if (S) S.event = null; }
