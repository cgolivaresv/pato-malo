# Pato Malo

Juego de escape en el navegador. Acabas de dar un golpe en una ciudad de Chile y la PDI te busca. Tienes que huir por Chile, Sudamérica y el mundo sin que te atrapen.

**Jugar:** [cgolivaresv.github.io/pato-malo](https://cgolivaresv.github.io/pato-malo/)

## Cómo se juega

1. Elige un golpe: camión de valores, joyería u óleo colonial. Cada uno tiene un objetivo distinto.
2. Muévete por el mapa en bus, avión o paso clandestino.
3. Escóndete, cambia de aspecto, compra un pasaporte falso o paga a un soplón.
4. Consigue dinero vendiendo tus cosas o parte del botín, haciendo encargos para bandas, asaltando o pidiendo al usurero.
5. Gana saliendo del continente y pasando migraciones.

## Lo que lo hace distinto

- **Rastros con retraso.** Cada acción puede dejar una huella que la policía descubre horas después. Te enteras por las noticias.
- **Una policía que razona.** La brigada viaja al último lugar donde supo de ti. Si pierde el rastro, vigila el aeropuerto internacional más cercano.
- **Calor.** Sube con cada rastro descubierto y hace más peligrosos los controles. Baja cuando te escondes.
- **Interpol.** Después de un plazo, tu documento real es casi una sentencia.
- **Recompensas diarias.** Cada 24 horas sin ser atrapado ganas dinero u objetos útiles.
- **Calor por país.** Cada país tiene su propio calor. La noticia sale donde te descubren y se filtra un poco a los vecinos; al cruzar una frontera llegas con el calor de ese país.
- **Geografía real.** Invierno o verano: en invierno la nieve cierra los pasos entre Chile y Argentina en el centro y sur. Transbordador de Chacao a Chiloé, barcaza de la Carretera Austral a Coyhaique (08:00), bus a Magallanes por Argentina, barco semanal Puerto Montt–Puerto Natales y controles aduaneros de la Ruta 5 en el Norte Grande.
- **Tutorial.** Pato Malo guía la primera fuga; se repite con el botón «?».

## Desarrollo

Necesitas Node.js 18 o más nuevo.

```bash
npm install      # instala Vite
npm run dev      # servidor local con recarga automática
npm run build    # genera la versión publicable en dist/
```

Cada vez que se sube un cambio a `main`, GitHub Actions compila el juego y lo publica en GitHub Pages.

## Estructura

```
index.html            Esqueleto de la página
src/
  main.js             Punto de entrada
  styles.css          Estilos y colores
  data/
    places.js         Países y 70 ciudades con coordenadas
    geo.js            Agrupaciones: Sudamérica, ciudades grandes, aeropuertos, fronteras
    content.js        Golpes, botín, objetos iniciales y recompensas
    map.json          Contornos de países ya proyectados
  lib/util.js         Utilidades (distancias, reloj, formato de dinero)
  game/               Lógica: no depende de la interfaz
    state.js          Estado de la partida (S)
    risk.js           Riesgo de controles y medios de transporte
    engine.js         Paso del tiempo, rastros, IA policial, recompensas, fin
    actions.js        Esconderse, bajo mundo, viajar
    money.js          Formas de conseguir dinero
    heat.js           Calor por país
  ui/                 Interfaz
    map.js            Mapa SVG y zoom
    render.js         Barra de estado, aviso de peligro, franja de ciudad y barra de acciones
    sheets.js         Hojas: Esconderse, Moverse, Plata, Bajo mundo y Noticias
    components.js     Tarjetas de decisión (tiempo, costo y riesgo)
    icons.js          Iconos SVG
    screens.js        Elegir golpe, informe y resultado
    events.js         Manejador único de clics (data-act / data-arg)
  assets/pato/        Ilustración y 8 expresiones del pato (WebP, fondo limpio)
  assets/detective/   Ilustración y 6 expresiones del detective McCuack
  ui/pato.js          Estado de ánimo del pato y sus frases
  ui/detective.js     Estado de ánimo y frases del detective McCuack
  ui/fx.js            Animación de viaje y sellos de McCuack
  ui/tutorial.js      Tutorial guiado de la primera fuga
public/
  favicon.png         Ícono del juego
  rastro-austral.html Prototipo anterior en modo detective
art/original/         Arte original de Pato Malo (referencia, no se publica)
art/detective-original/ Arte original del detective McCuack (referencia)
```

## Interfaz

Diseño "expediente de fuga": en el teléfono, una sola pantalla con barra de estado compacta, aviso de peligro con cinta policial, mapa grande y una barra de acciones fija abajo que abre hojas deslizables. Cada opción es una tarjeta que muestra tiempo, costo y riesgo de un vistazo. En escritorio, el mapa queda a la izquierda y las acciones en un panel lateral.

## Personaje

El pato reacciona a lo que pasa en la fuga: se burla en una casa segura, se asusta con una noticia nueva o con la PDI cerca, se enoja con el calor alto, guiña disfrazado, ríe si escapas y queda triste si lo atrapan. Las imágenes del juego son recortes limpios del paquete original en `art/original/`, con el fondo quitado y convertidos a WebP.

## El rival

El **Detective Patrick McCuack**, jefe de la Brigada de Robos, encabeza la persecución. Aparece en el mapa cuando pagas al soplón, habla cuando descubre un rastro tuyo y comenta el final de cada fuga. Su lema: «La ley también tiene patas».

## Mapa

Los contornos de los países vienen de [Natural Earth](https://www.naturalearthdata.com/) (dominio público), vía el paquete `world-atlas`. Cada ciudad tiene enlaces a Google Maps y Street View.
