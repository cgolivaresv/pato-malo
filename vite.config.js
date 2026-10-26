import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// En GitHub Pages el juego vive en /pato-malo/
export default defineConfig({
  base: '/pato-malo/',
  // Versión visible en la pantalla de inicio: número de package.json + commit publicado
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify((process.env.GITHUB_SHA || 'local').slice(0, 7)),
  },
});
