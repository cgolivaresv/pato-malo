# Pato Malo

Juego de escape en el navegador. Acabas de dar un golpe en una ciudad de Chile y la PDI te busca. Tienes que huir por Chile, Sudamérica y el mundo sin que te atrapen.

**Jugar:** [cgolivaresv.github.io/pato-malo](https://cgolivaresv.github.io/pato-malo/)

## Cómo se juega

1. Elige un golpe. Hay ocho, de menor a mayor dificultad: lanzazo en el persa, bomba de bencina en la Ruta 5, casa de cambio, camión de valores, joyería, óleo colonial, la bóveda de un casino y lingotes de una bóveda bancaria; los grandes se desbloquean con experiencia.
2. **Prepara el golpe** en una ciudad chilena al azar, cada una con su sello (ascensores en Valparaíso, metro en Santiago, muelle en los puertos). Hay un imprevisto del día (lluvia, paro de micros, partido de la Roja, temblor…) y a veces un capo te ofrece un encargo con condiciones. Arma tu equipo con personajes que cobran su parte y pueden sapearte, soborna al conserje o a un guardia, compra los planos, trabaja de aseador para entrar desde adentro, cava un túnel, haz una llamada falsa a Carabineros, compra herramientas y deja un vehículo (y un plan B). Cada preparativo despierta la sospecha de McCuack, que puede aparecer de civil.
3. **Da el golpe por turnos** en el plano del barrio: camina casilla por casilla, esquiva los conos de visión de guardias y cámaras, fuerza puertas, corta la luz o las cámaras, distrae a los guardias y decide cuánto botín cargar (más peso, más lento). Si suena la alarma, Carabineros sale del retén. Lo que pase ahí (grabado, visto, alarma, por dónde saliste) define cómo empieza la fuga.
4. Huye. En los golpes chicos basta con llegar a una casa segura fuera de Chile; en los grandes hay que armar un **plan de escape** con un capitán de carguero, un piloto de avioneta o un falsificador maestro, siguiendo rumores que pueden ser falsos.
5. Muévete por el mapa en bus, avión, paso clandestino o barco, esquivando los controles y la zona de búsqueda de McCuack. Escóndete, disfrázate, consigue plata y sal del continente.
6. Gana experiencia, sube de rango (Ratero, Lanza, Choro, Capo, Leyenda) y mejora habilidades en tu **prontuario**.

## Lo que lo hace distinto

- **Carrera criminal.** Experiencia por cada golpe, día libre y fuga exitosa (algo se gana aunque te atrapen). Cinco rangos desbloquean golpes nuevos. Cada rango y cada fuga dan un punto de habilidad: Sigilo (rastros que nunca aparecen), Labia (rumores más confiables), Contactos (más casas seguras y contactos más baratos), Manos rápidas (más botín) y Aguante (más horas sin dormir). Se guarda en el navegador.
- **Golpe táctico.** Plano generado en cada partida, con niebla en las piezas que no conoces, guardias con sospecha (¿?) y rondas, cámaras, ruido, botín con peso y salida por la ciudad con patrullas.
- **Equipo que dura.** Los integrantes que salen bien suben de nivel (cobran menos y sapean menos); los que caen quedan presos unos golpes y desde la cárcel pueden sapearte.
- **Ciudades con memoria.** Donde ya robaste hay más guardias, más cámaras y tu cara en los carteles.

- **Plan de escape.** Tres salidas, cada una con un contacto escondido que hay que encontrar siguiendo rumores. Volar directo con tu documento real casi nunca funciona: migraciones te espera.
- **Rastros con retraso.** Cada acción puede dejar una huella que la policía descubre horas después.
- **Parte de novedades.** Después de cada acción aparece un parte con todo lo nuevo (resultados, rumores, rastros descubiertos, movimientos de McCuack), con las alertas primero. Se cierra con «Entendido» o tocando cualquier otra cosa; el historial completo queda en Noticias.
- **Persecución visible.** La brigada de McCuack siempre se ve en el mapa. Cada rastro abre una zona de búsqueda que crece con las horas, y McCuack instala controles en las ciudades cercanas. Si la brigada llega mientras duermes, te despiertan las sirenas.
- **Eventos con decisiones.** Quince situaciones en viajes y ciudades (el taxista que te reconoce, un control carretero, la fonda, un temblor, un quiltro, la llamada de McCuack…), cada opción con su costo y riesgo a la vista.
- **Calor.** Sube con cada rastro descubierto y hace más peligrosos los controles. Baja cuando te escondes.
- **Interpol.** Después de un plazo, tu documento real es casi una sentencia.
- **Recompensas diarias.** Cada 24 horas sin ser atrapado ganas dinero u objetos útiles.
- **Calor por país.** Cada país tiene su propio calor. La noticia sale donde te descubren y se filtra un poco a los vecinos; al cruzar una frontera llegas con el calor de ese país.
- **Geografía real.** Invierno o verano: en invierno la nieve cierra los pasos entre Chile y Argentina en el centro y sur. Transbordador de Chacao a Chiloé, barcaza de la Carretera Austral a Coyhaique (08:00), bus a Magallanes por Argentina, barco semanal Puerto Montt–Puerto Natales y controles aduaneros de la Ruta 5 en el Norte Grande.
- **Música y sonidos.** Tema de misterio policial generado en el navegador (Web Audio, sin archivos): tic-tac de reloj, bajo que desciende de a medio tono, acordes sostenidos, vibráfono con eco y violonchelo. Se acelera y suma timbales, latido y cuerdas en staccato con el peligro, y suena una sirena lejana cuando la brigada está en tu ciudad. Cada botón, viaje, sello, evento y final tiene su sonido. El botón de nota musical cambia entre música y sonidos, solo sonidos o silencio.
- **Tutorial.** Pato Malo guía la primera fuga; se puede repetir desde la pantalla de inicio o con el botón «?».

## Desarrollo

Necesitas Node.js 18 o más nuevo.

```bash
npm install      # instala Vite
npm run dev      # servidor local con recarga automática
npm run build    # genera la versión publicable en dist/
```

Cada vez que se sube un cambio a `main`, GitHub Actions compila el juego y lo publica en GitHub Pages.

Para medir el balance, con `npm run dev` abre `/pato-malo/sim/` y ejecuta `runSim(120)` en la consola: juega fugas automáticas con varias estrategias y muestra cuánto gana cada una. El simulador no se publica. Con la versión 0.11.0 y el plan de golpe por defecto, el simulador gana entre 80 y 90% de los golpes chicos (lanzazo y bomba de bencina), entre 30 y 45% de la casa de cambio, alrededor de 28% del camión, y entre 13 y 25% de la joyería, el óleo, el casino y la bóveda. Volar directo con documento real sigue fallando casi siempre. Una persona jugando con cuidado debería ganar más.

## Estructura

```
index.html            Esqueleto de la página
src/
  main.js             Punto de entrada
  styles.css          Estilos y colores
  data/
    places.js         Países y 70 ciudades con coordenadas
    geo.js            Agrupaciones: Sudamérica, ciudades grandes, aeropuertos, fronteras
    content.js        Golpes, rangos, habilidades, botín y recompensas
    heistdata.js      Ciudades, equipo, imprevistos, encargos, preparativos y herramientas del golpe
    map.json          Contornos de cada país ya proyectados, con punto para su nombre
  lib/util.js         Utilidades (distancias, reloj, formato de dinero)
  game/               Lógica: no depende de la interfaz
    state.js          Estado de la partida (S)
    risk.js           Riesgo de controles y medios de transporte
    engine.js         Paso del tiempo, rastros, IA policial, recompensas, fin
    actions.js        Esconderse, bajo mundo, viajar
    money.js          Formas de conseguir dinero
    heat.js           Calor por país
    plan.js           Plan de escape: rumores, contactos y salidas
    heist.js          Preparación del golpe y paso del plano a la fuga
    board.js          Golpe táctico por turnos: plano, guardias, cámaras, ruido, alarma y patrullas
    career.js         Experiencia, rangos, golpes desbloqueados y habilidades
    pursuit.js        Zona de búsqueda, controles y riesgo de redada
    events.js         Eventos con decisiones
  ui/                 Interfaz
    map.js            Mapa de fuga: capas, etiquetas y gestos (arrastrar, pellizcar, rueda)
    render.js         Barra de estado, aviso de peligro, franja de ciudad y barra de acciones
    sheets.js         Hojas: Esconderse, Moverse, Plata, Escape y Noticias
    components.js     Tarjetas de decisión (tiempo, costo y riesgo)
    icons.js          Iconos SVG
    screens.js        Elegir golpe, informe y resultado
    digest.js         Parte de novedades después de cada acción
    heistui.js        Escalera de golpes, preparación, resultado del golpe y prontuario
    boardui.js        Pantalla del plano del golpe
    events.js         Manejador único de clics (data-act / data-arg)
  assets/pato/        Ilustración y 8 expresiones del pato (WebP, fondo limpio)
  assets/detective/   Ilustración y 6 expresiones del detective McCuack
  ui/pato.js          Estado de ánimo del pato y sus frases
  ui/detective.js     Estado de ánimo y frases del detective McCuack
  ui/fx.js            Animación de viaje y sellos de McCuack
  ui/tutorial.js      Tutorial guiado de la primera fuga
  ui/title.js         Pantalla de inicio animada
  audio/sound.js      Música y efectos sintetizados con Web Audio
public/
  favicon.png         Ícono del juego
  rastro-austral.html Prototipo anterior en modo detective
art/original/         Arte original de Pato Malo (referencia, no se publica)
art/detective-original/ Arte original del detective McCuack (referencia)
```

## Pantalla de inicio

Empieza con una escena nocturna: suena la alarma, la cinta policial y las sirenas barren la calle bajo la lluvia, Pato Malo entra corriendo, cae el sello del título y McCuack se asoma con su linterna. Después la cámara se aleja hasta el mapa de fuga, donde una ruta de escape se traza en bucle ciudad por ciudad mientras McCuack la sigue y marca cada lugar con una X. Tocar la pantalla salta la intro; con movimiento reducido se muestra directo el mapa.

## Interfaz

Diseño "expediente de fuga": en el teléfono, una sola pantalla con barra de estado compacta, aviso de peligro con cinta policial, mapa grande y una barra de acciones fija abajo que abre hojas deslizables. Cada opción es una tarjeta que muestra tiempo, costo y riesgo de un vistazo. En escritorio, el mapa queda a la izquierda y las acciones en un panel lateral.

## Personaje

El pato habla en chileno de la calle y reacciona a lo que pasa en la fuga: se burla en una casa segura, se asusta con una noticia nueva o con la PDI cerca, se enoja con el calor alto, se pone nervioso en un control o en la zona de búsqueda, se queja del sueño y de andar sin lucas, guiña disfrazado, ríe si escapas y queda triste si lo atrapan. Las imágenes del juego son recortes limpios del paquete original en `art/original/`, con el fondo quitado y convertidos a WebP.

## El rival

El **Detective Patrick McCuack**, jefe de la Brigada de Robos, encabeza la persecución. Habla culto, formal e irónico, y siempre trata de usted al «señor Pato». Aparece en el mapa cuando pagas al soplón, habla cuando descubre un rastro tuyo y comenta el final de cada fuga. Su lema: «La ley también tiene patas».

## Mapa

El mapa es propio del juego: un "mapa de fuga" en SVG que se arrastra, se pellizca y se acerca con la rueda o con doble toque. Muestra fronteras, la cordillera de los Andes (nevada en invierno), el ecuador y los trópicos, el calor de cada país pintado en rojo, tu recorrido, la ruta al destino elegido, brújula y escala. Los nombres de ciudades aparecen según el zoom sin pisarse. No usa servicios externos de mapas.

Los contornos de los países vienen de [Natural Earth](https://www.naturalearthdata.com/) (dominio público), vía el paquete `world-atlas`.
