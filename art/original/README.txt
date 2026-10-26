PATO MALO — PACK INICIAL DE ASSETS WEB

Contenido
- assets/pato_malo.png: recorte PNG del personaje principal (recorte automático aproximado desde la lámina conceptual).
- assets/sprites/: secuencias PNG de 6 cuadros por acción (idle, correr, saltar, caer, escapar). Estas secuencias son variaciones de pose generadas a partir de la ilustración principal; no son un rig 3D ni dibujos independientes completos.
- assets/expresiones/: recortes de referencia de expresiones tomados de la lámina visual. Conservan parte del fondo de la lámina; son referencias, no transparencias limpias.
- assets/lamina_concepto.png: lámina visual completa de referencia.
- index.html, css/style.css, js/game.js: demo móvil interactiva de ejemplo.

Instalación
1. Descomprime PatoMalo_GameAssets.zip.
2. Abre la carpeta y ejecuta index.html en un navegador moderno. Si el navegador bloquea recursos locales, desde esa carpeta ejecuta: python -m http.server 8000 y abre http://localhost:8000.
3. Para tu juego existente, copia assets/ a tu proyecto y ajusta las rutas. La demo sirve como referencia de HTML/CSS/JS, no reemplaza el código de tu juego.

Uso en HTML
<img src="assets/pato_malo.png" alt="Pato Malo">

Animación CSS simple
<img id="pato" src="assets/pato_malo.png" class="pato" alt="Pato Malo">

Importante sobre calidad del arte
El arte de origen es una lámina conceptual generada como imagen. Por eso, el recorte del personaje y los cuadros son una base práctica para prototipar, pero no equivalen a un pack profesional de sprites dibujados cuadro por cuadro. Para producción conviene limpiar el canal alfa y redibujar/riggear las animaciones, o exportar un modelo 3D animado.
