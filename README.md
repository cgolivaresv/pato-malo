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
  ui/                 Interfaz
    map.js            Mapa SVG y zoom
    render.js         Barra de estado y pestañas
    screens.js        Elegir golpe, informe y resultado
    events.js         Manejador único de clics (data-act / data-arg)
public/
  rastro-austral.html Prototipo anterior en modo detective
```

## Mapa

Los contornos de los países vienen de [Natural Earth](https://www.naturalearthdata.com/) (dominio público), vía el paquete `world-atlas`. Cada ciudad tiene enlaces a Google Maps y Street View.
