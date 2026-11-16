# Arquitectura y mantenimiento

PerfectEye es una **web estática** con un **servidor mínimo** para el ranking mundial: un Cloudflare Worker (`src/server/worker.ts`) y una base de datos Cloudflare D1. Los archivos de la web se sirven como "static assets" sin ejecutar código; solo `/api/*` llega al Worker (configurado en `wrangler.jsonc`). Todo el juego corre en el navegador y funciona aunque el servidor no responda.

## Estructura

```
src/
  platform/            Piezas reutilizables por cualquier juego diario
    date.ts            Calendario UTC (clave del día, cuenta regresiva)
    rng.ts             Generador pseudoaleatorio determinista (cyrb128 + sfc32)
    geometry.ts        Geometría 2D y conversión puntero → tablero
    storage.ts         Interfaz de almacenamiento (localStorage seguro o memoria)
    settings.ts        Idioma y tema
    site.ts            URL pública y flags de funcionalidades (anuncios)
  i18n/                Traducciones (en.ts, es.ts) y utilidades
  games/classic/       El juego PerfectEye (5 pruebas)
    config.ts          ID del juego, versión del generador, fecha de lanzamiento
    types.ts           Tipos de desafíos, respuestas y resultados
    generator.ts       Generación determinista del desafío diario
    scoring.ts         Fórmulas de puntuación (ver docs/SCORING.md)
    evaluate.ts        Cálculo del error de cada prueba + validación de respuestas
    persistence.ts     Progreso, historial y regla "no se puede puntuar dos veces"
    stats.ts           Estadísticas (rachas, promedios, 30 días)
    share.ts           Texto y enlaces para compartir
    rounds/            Tableros SVG interactivos de cada prueba
  ui/                  Pantallas, componentes, hooks y tablero base
  styles/global.css    Diseño (tokens de color para modo claro/oscuro)
  games/classic/submission.ts  Validación y puntaje de envíos al ranking (compartido cliente/servidor)
  server/ranking.ts    Consultas a D1: guardar resultado, ranking del día, percentiles
  platform/api.ts      Cliente del ranking (falla de forma segura sin conexión)
  platform/player.ts   Identidad anónima del jugador (id aleatorio + nombre elegido)
  server/api.ts        Servidor: GET/POST /api/results
  server/worker.ts     Punto de entrada del Worker (API + archivos estáticos)
wrangler.jsonc         Configuración de Cloudflare (nombre, assets, base D1)
tests/unit/            Pruebas Vitest (lógica)
e2e/                   Pruebas Playwright (navegador real, 4 dispositivos)
public/                Íconos, manifest, cabeceras de seguridad (_headers)
```

## Cómo funciona el desafío diario

1. La "clave del día" es la fecha **UTC** (`2026-11-20`). Cambia a las 00:00 UTC para todo el mundo.
2. Cada prueba usa la semilla `perfecteye-classic:v1:<día>:<prueba>`, que alimenta un generador pseudoaleatorio determinista. El mismo día produce exactamente el mismo desafío en cualquier dispositivo.
3. Las coordenadas generadas se redondean a 0,1 unidades para que todos los navegadores den el mismo resultado.
4. El **juego libre** usa la semilla `perfecteye-classic:v1:practice-<id aleatorio>:<prueba>`. Sus partidas no se guardan ni cuentan en las estadísticas.
5. El número del desafío se calcula como los días transcurridos desde `LAUNCH_DAY` + 1.

**No cambies `GENERATOR_VERSION` ni la lógica de `generator.ts` después del lanzamiento** salvo que sea intencional: cambiaría los desafíos de todos (la prueba de snapshot avisará).

## Reglas anti-trampa (locales)

- Cada respuesta confirmada se guarda en el momento. `confirmRound` solo acepta la prueba siguiente, así que recargar la página no permite repetir una prueba.
- En las pruebas de memoria (ángulo y forma), la figura se marca como "ya mostrada" **antes** de mostrarse. Si se recarga la página, no se vuelve a mostrar.
- Todo lo que se lee de localStorage se valida. Los datos corruptos se descartan.
- Limitación: un usuario técnico puede editar su almacenamiento local o cambiar el reloj de su dispositivo. Como no hay ranking global, esto solo afecta sus propias estadísticas. Un ranking mundial real requiere un servidor que valide los resultados.

## Ranking mundial (servidor)

- `POST /api/results` recibe `{ day, playerId, name, answers }`. El servidor **no acepta puntajes**: regenera el desafío del día y recalcula cada puntaje a partir de las respuestas, con el mismo código que el juego.
- El **primer** resultado de cada jugador por día es el definitivo. Si se vuelve a enviar, solo se actualiza el nombre.
- Solo se aceptan resultados de hoy o de ayer (UTC). Los nombres tienen de 2 a 20 letras o números, con un filtro básico de palabras ofensivas.
- `GET /api/results?day=…&playerId=…` devuelve el top 50 del día, la cantidad de jugadores y tu posición. Los percentiles se calculan como "% de los demás jugadores de hoy con un puntaje menor", total y por prueba.
- La tabla `results` se crea sola en la primera petición.

**Límites conocidos (decirlo con honestidad):** el generador de desafíos está en el navegador, así que una persona con conocimientos técnicos podría calcular las respuestas perfectas o enviar resultados con muchos ids distintos. El ranking evita que se *inventen* puntajes, pero no evita bots. Mejoras posibles a futuro: Cloudflare Turnstile (gratis) contra bots, semilla secreta en el servidor para que el desafío no se pueda precalcular, y validación del tiempo de juego del lado del servidor.

## Visitas, comentarios y panel del dueño

- `POST /api/visit`: una vez por día y por dispositivo (id al azar), para contar visitantes únicos. Sin cookies.
- `POST /api/event`: cuenta las partidas libres terminadas.
- `POST /api/feedback`: mensajes de contacto (máximo 5 por jugador por día, hasta 1000 caracteres).
- `GET /api/world`: respuestas de todos los jugadores del día, transformadas en errores. Solo responde a quien ya jugó ese día (si no, 403), para no regalar las soluciones.
- `/api/admin*`: exige `Authorization: Bearer <ADMIN_TOKEN>` (secreto de Cloudflare, comparado en tiempo constante). Sin el secreto, el panel queda apagado (503).
- Las tablas y columnas nuevas se crean o agregan solas (`ensureSchema`), sin perder datos.

## Temporizador

Cada prueba da 60 segundos (`ROUND_TIME_MS` en `config.ts`). El inicio se guarda en el progreso, así que recargar la página no reinicia el reloj. Al terminar el tiempo cuenta lo que haya en el tablero; si no hay nada, vale 0.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm test` | Pruebas unitarias |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run test:e2e` | Pruebas de navegador con el servidor y la base de datos reales de Cloudflare en modo local (requiere `npm run build` antes) |
| `npx wrangler dev` | Probar la web con el ranking en http://localhost:8787 (después de `npm run build`) |
| `npm run check` | Todo lo anterior en orden |

## Cómo agregar cosas en el futuro

- **Un texto nuevo:** agregar la clave en `src/i18n/en.ts` y `src/i18n/es.ts`. Una prueba verifica que ambos idiomas tengan las mismas claves.
- **Otro idioma:** crear `src/i18n/xx.ts` con el tipo `Messages` y registrarlo en `src/i18n/index.tsx` (`LANGS`, `DICTIONARIES`, `isLang`).
- **Una prueba nueva dentro de PerfectEye:** agregar su tipo en `types.ts`, su generador en `generator.ts`, su evaluación en `evaluate.ts`, su curva en `scoring.ts`, su tablero en `rounds/` y sus textos. Ojo: cambia el máximo de puntos y el formato del historial, así que conviene versionar las claves de almacenamiento (`.v2`).
- **Otro juego diario en la misma plataforma:** crear `src/games/<nuevo>/` reutilizando `platform/` (fecha, RNG, almacenamiento, i18n) con su propio `GAME_ID` y sus propias claves de almacenamiento, y agregar una pantalla o ruta para elegir el juego.
- **Cuenta opcional / sincronización:** implementar otro `KeyValueStore` (en `platform/storage.ts`) que sincronice con un servidor. El historial ya se guarda por día y con datos validados, así que se puede subir tal cual.
- **Ranking global:** ya implementado (ver arriba). Para endurecerlo contra bots, ver "Límites conocidos".
- **Anuncios / patrocinios:** activar `FEATURES.ads` en `platform/site.ts` y completar `ui/components/AdSlot.tsx`. Los espacios ya están reservados en inicio y resultados, nunca durante las pruebas. Para AdSense hay que agregar sus dominios a la política CSP de `public/_headers` y probablemente un aviso de cookies.
- **Premium:** requiere cuentas y un proveedor de pagos. Conviene empezar por la cuenta opcional.
