# Estado del proyecto — PerfectEye

Última actualización: 2026-11-13 · Versión 1.0.0 (MVP)

## ✅ Funcionalidades completadas

- **Las cinco pruebas** (Find the Center, Perfect Half, Angle Master, Equal Distance, Perfect Shape). Cada una tiene interacción táctil, de mouse y de teclado, muestra el resultado con la respuesta correcta, una línea de error animada, el puntaje de 0 a 100 y una explicación del error.
- **Desafío diario determinista:** fecha UTC + ID del juego + semilla + generador pseudoaleatorio. Es el mismo desafío para todos, cambia a las 00:00 UTC y no requiere servidor ni IA.
- Contador hasta el próximo desafío, con la hora local equivalente a las 00:00 UTC.
- Una partida empezada antes de medianoche conserva su desafío. Si quedó sin terminar, se puede completar al día siguiente.
- **No se puede puntuar dos veces:** cada respuesta se guarda al confirmarla, y las figuras de memoria se muestran una sola vez, aunque se recargue la página.
- **Estadísticas locales:** partidas jugadas, mejor puntuación, promedio, racha actual y máxima, gráfico de los últimos 30 días, y promedio y mejor puntaje por prueba.
- **Compartir:** compartir nativo del dispositivo (si está disponible), copiar, WhatsApp, X y Telegram. El mensaje no revela las soluciones.
- **Inglés y español:** se detecta el idioma del navegador, se puede cambiar a mano y la preferencia queda guardada.
- **Modo claro y oscuro:** sigue al sistema por defecto, se puede cambiar a mano y queda guardado.
- Diseño propio con estética de **cuaderno de campo**: papel con textura, tinta, anotaciones a mano, cinta adhesiva, barras sombreadas a lápiz e íconos dibujados. El modo oscuro es tipo pizarrón. Es mobile-first y responsive, y respeta la preferencia de "movimiento reducido". Usa las tipografías Young Serif, Karla y Caveat (licencia libre OFL), incluidas en el propio sitio, sin pedir nada a Google.
- **Teclado en computadora:** las flechas ajustan la respuesta sin hacer clic antes en el tablero. Mayús + flechas da pasos mínimos y Enter confirma. En La forma perfecta, 1, 2 y 3 eligen el punto. Se muestra una ayuda en pantalla.
- Seguridad: política CSP estricta y cabeceras de seguridad (`public/_headers`). Todo lo que se lee del almacenamiento se valida. No hay secretos ni solicitudes externas.
- Espacios reservados (desactivados) para futuros anuncios en inicio y resultados.
- Íconos, manifest e imagen para redes sociales.
- Documentación: README, docs/DEPLOY.md, docs/SCORING.md, docs/ARCHITECTURE.md.

## 🧪 Pruebas ejecutadas (resultados reales del 2026-11-12)

| Verificación | Resultado |
|---|---|
| Compilación de producción (`tsc` + `vite build`) | ✅ Sin errores. JS 87 KB comprimido, CSS 4,4 KB |
| Pruebas unitarias (Vitest) | ✅ 78/78 |
| Fórmulas: perfecto = 100, rango 0–100, monotonía, valores de referencia | ✅ |
| Mismo día → mismo desafío | ✅ |
| 1000 días consecutivos → 1000 desafíos distintos (y cada prueba distinta por separado) | ✅ |
| Figuras dentro del tablero, sin configuraciones triviales | ✅ (sobre 1000 días) |
| Guardado y validación de datos (incluidos datos corruptos o manipulados) | ✅ |
| No se puede puntuar dos veces (lógica y recarga real en el navegador) | ✅ |
| Pruebas de navegador (Playwright): escritorio, iPhone 13, Pixel 7 y iPad emulados | ✅ 58 pasan, 6 omitidas a propósito (pruebas de teclado solo en escritorio) |
| Flechas sin hacer clic antes, Mayús para pasos finos, 1/2/3 en la forma | ✅ |
| Partida completa, resultados, estadísticas | ✅ |
| Diseño: sin scroll horizontal, tablero cuadrado y botón visible en las 5 pruebas, en ambos idiomas | ✅ |
| Arrastre táctil sin que se desplace la página | ✅ (eventos táctiles emulados) |
| Cambio de idioma y detección automática | ✅ |
| Modo oscuro (manual y del sistema) | ✅ |
| Mensaje para compartir y copiar al portapapeles | ✅ |
| Cambio de día a medianoche UTC | ✅ |
| Sin errores en consola, incluso con la política CSP de producción | ✅ |
| `npm audit` | ✅ 0 vulnerabilidades |

### Limitaciones de las pruebas (dicho explícitamente)

- Las pruebas de navegador usan **Chromium** emulando iPhone, Android e iPad. **No** se probó en Safari/WebKit real ni en dispositivos físicos, porque el entorno no los tiene. Conviene probarlo en un iPhone y un Android reales después de publicar.
- El botón "Compartir…" nativo no se puede probar en un navegador sin pantalla. Se probaron copiar y los enlaces de WhatsApp, X y Telegram.
- No se corrió Lighthouse ni una auditoría de accesibilidad automatizada.

## ⏳ Pendiente

- **Publicar en Cloudflare Pages** (requiere tu cuenta de GitHub y de Cloudflare; ver docs/DEPLOY.md).
- Probar en dispositivos reales (iPhone con Safari, Android con Chrome).
- Decidir la fecha del desafío #1 (`LAUNCH_DAY`, hoy en 2026-11-12).
- Opcional: dominio propio y `VITE_SITE_URL`.

## 🐞 Errores conocidos / limitaciones

- La integridad es solo local: quien sepa editar el almacenamiento del navegador o cambiar el reloj del dispositivo puede alterar sus propias estadísticas. No afecta a nadie más, porque no hay ranking global.
- Las estadísticas viven solo en ese navegador. Si se borran los datos o se cambia de dispositivo, se pierden.
- Juego visual: no se puede jugar por completo con un lector de pantalla. Sí se puede con el teclado.
- En pantallas muy bajas (un celular en horizontal) puede hacer falta desplazarse para ver el botón.
- El español usa "tú" neutro para llegar a más países. Se puede cambiar a voseo si se prefiere.

## 🧭 Decisiones técnicas

- **React + TypeScript + Vite**, como se pidió. Se consideró Preact para ahorrar unos 40 KB, pero React ofrece más estabilidad y facilidad de mantenimiento.
- **Sin librerías extra**: el router, las traducciones, los gráficos y la validación son propios y pequeños. Solo hay 2 dependencias de producción (react y react-dom).
- **Tablero SVG de 1000×1000 unidades** con `preserveAspectRatio="meet"`: las figuras nunca se deforman y las respuestas se miden en unidades del tablero, no en píxeles.
- **Arrastre relativo**: al arrastrar un marcador existente, este se mueve con el dedo pero sin quedar debajo de él, para no taparlo.
- **Pruebas de memoria con la base rotada** (ángulo): obliga a recordar la apertura y no la posición en pantalla.
- **Triángulo con correspondencia óptima**: se prueban las 6 asignaciones posibles entre vértices y se usa la mejor. Así no importa qué punto mueve el jugador.
- **Se guardan las respuestas, no los puntajes**, de las partidas en curso. El puntaje se recalcula de forma determinista. Las partidas terminadas guardan su puntaje en el historial.
- **Tipografías incluidas en el propio sitio** (paquetes @fontsource, subconjunto latino), sin pedir nada a terceros. Los puntajes usan Karla porque en la serifa el 0 y el 1 se confunden con O e I.

## 🚀 Próximos pasos sugeridos

1. Publicar (Fase G) y probar en tu celular.
2. Compartir con amigos y recoger comentarios sobre la dificultad. Las curvas se ajustan en `scoring.ts`.
3. Analítica respetuosa de la privacidad y sin cookies (por ejemplo Cloudflare Web Analytics, gratis), si quieres medir visitas.
4. Más adelante: cuenta opcional con sincronización, ranking validado por servidor, más pruebas o juegos, anuncios y patrocinios.
