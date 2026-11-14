# PerfectEye

**¿Qué tan preciso es tu ojo?** Es un juego web diario de precisión visual. Cada día, todos los jugadores reciben las mismas cinco pruebas:

| | Prueba | Qué hay que hacer |
|---|---|---|
| 🎯 | Find the Center | Tocar el centro exacto de un círculo |
| 📏 | Perfect Half | Marcar la mitad exacta de una línea |
| 📐 | Angle Master | Memorizar un ángulo (3 s) y reconstruirlo |
| 📍 | Equal Distance | Deslizar C para que B–C mida lo mismo que A–B |
| 🔺 | Perfect Shape | Memorizar un triángulo (5 s) y redibujarlo |

Cada prueba vale hasta 100 puntos, con un máximo de 500 por día. Además hay un **juego libre** ilimitado, con desafíos nuevos cada vez, que no cuenta en las estadísticas. El desafío cambia todos los días a las **00:00 UTC**. No hace falta registrarse, y funciona en celulares, tablets y computadoras, en inglés y en español.

## Para el dueño del proyecto (sin programar)

- **Publicar la web:** seguí [docs/DEPLOY.md](docs/DEPLOY.md), paso a paso.
- **Estado del proyecto, pruebas y próximos pasos:** [PROJECT_STATUS.md](PROJECT_STATUS.md).
- **Cómo se calculan los puntos:** [docs/SCORING.md](docs/SCORING.md).
- **Cómo está organizado el código y cómo crecer:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Costo actual: **USD 0**. No hay servidor, base de datos, anuncios ni servicios pagos.

## Para desarrolladores

Requisitos: Node.js 20 o superior (recomendado 22).

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # pruebas unitarias (Vitest)
npm run build        # producción → dist/
npm run test:e2e     # pruebas de navegador (Playwright), después de build
npm run check        # todo junto
```

Stack: React 19, TypeScript, Vite, SVG y CSS propios (sin librerías de UI). Pruebas con Vitest y Playwright. Se publica como sitio estático en Cloudflare Pages.

## Privacidad

PerfectEye no usa cookies, analítica ni servicios externos. El progreso y las estadísticas se guardan solo en el navegador del jugador (localStorage). Si se borran los datos del navegador, se pierden.
